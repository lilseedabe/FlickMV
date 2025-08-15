/**
 * FlickMV On-demand Worker with Watermark Support
 * - Single-run worker: fetches at most one job from pg-boss and exits (suitable for Cloud Run Jobs)
 * - Generates a placeholder video via ffmpeg with FlickMV watermark based on user plan
 * - Applies watermark settings from export job metadata
 * - Optionally uploads result to Cloudflare R2 (S3-compatible) if credentials are provided
 * - Reports progress and final status to server internal API with x-internal-key
 *
 * Required env:
 *   - DATABASE_URL               : Postgres connection string for pg-boss (Supabase)
 *   - INTERNAL_API_BASE          : https://api.example.com/api/internal
 *   - INTERNAL_API_KEY           : shared secret for internal endpoints
 * Optional env:
 *   - EXPORT_QUEUE_NAME          : default 'video-export'
 *   - R2_ENDPOINT                : https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 *   - R2_BUCKET                  : flickmv-exports
 *   - R2_ACCESS_KEY_ID           : ...
 *   - R2_SECRET_ACCESS_KEY       : ...
 *   - R2_PUBLIC_BASE_URL         : https://cdn.yourdomain.com/exports
 *   - LOG_LEVEL                  : info | debug | error
 */

const PgBoss = require('pg-boss');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const log = {
  info: (...args) => (['info', 'debug'].includes(LOG_LEVEL) ? console.log('[INFO]', ...args) : undefined),
  debug: (...args) => (LOG_LEVEL === 'debug' ? console.log('[DEBUG]', ...args) : undefined),
  error: (...args) => console.error('[ERROR]', ...args),
};

// Watermark presets matching the server-side configuration
const WATERMARK_PRESETS = {
  minimal: {
    position: { x: 85, y: 10 },
    size: 12,
    opacity: 60,
    style: 'minimal'
  },
  branded: {
    position: { x: 50, y: 50 },
    size: 25,
    opacity: 30,
    style: 'branded'
  },
  corner: {
    position: { x: 90, y: 90 },
    size: 15,
    opacity: 70,
    style: 'corner'
  },
  center: {
    position: { x: 50, y: 85 },
    size: 18,
    opacity: 50,
    style: 'center'
  }
};

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
}

function getEnv(name, def) {
  const v = process.env[name];
  return v !== undefined ? v : def;
}

/**
 * Generate FFmpeg watermark filter based on settings
 */
function generateWatermarkFilter(watermarkSettings, videoWidth = 1080, videoHeight = 1920) {
  if (!watermarkSettings || !watermarkSettings.enabled) {
    return null;
  }

  const preset = WATERMARK_PRESETS[watermarkSettings.preset] || WATERMARK_PRESETS.minimal;
  
  // Calculate absolute position from percentage
  const x = Math.round((preset.position.x / 100) * videoWidth);
  const y = Math.round((preset.position.y / 100) * videoHeight);
  
  // Calculate font size based on video resolution and preset size
  const fontSize = Math.round((preset.size / 720) * videoHeight * 0.05);
  
  // Base text filter
  let textFilter = `drawtext=text='FlickMV':fontcolor=white:fontsize=${fontSize}:x=${x}:y=${y}:alpha=${preset.opacity / 100}`;
  
  // Add style-specific modifications
  switch (preset.style) {
    case 'minimal':
      textFilter += ':shadowcolor=black:shadowx=1:shadowy=1';
      break;
    case 'branded':
      textFilter += ':fontcolor=0x6366f1:borderw=1:bordercolor=white';
      break;
    case 'corner':
      textFilter += ':box=1:boxcolor=black@0.6:boxborderw=5';
      break;
    case 'center':
      textFilter += ':box=1:boxcolor=black@0.4:boxborderw=10:borderw=1:bordercolor=white@0.3';
      break;
  }

  return textFilter;
}

async function main() {
  const connectionString = required('DATABASE_URL');
  const internalBase = required('INTERNAL_API_BASE').replace(/\/+$/, '');
  const internalKey = required('INTERNAL_API_KEY');
  const queueName = getEnv('EXPORT_QUEUE_NAME', 'video-export');

  // Initialize pg-boss
  const boss = new PgBoss({ connectionString, schema: process.env.PGBOSS_SCHEMA || undefined });
  await boss.start();
  log.info('pg-boss started');

  // Fetch one job (single-run)
  const job = await boss.fetch(queueName);
  if (!job) {
    log.info('No job available. Exiting.');
    await boss.stop();
    process.exit(0);
    return;
  }

  log.info('Fetched job:', job.id, 'data=', job.data);

  const exportJobId = job.data && job.data.exportJobId;
  if (!exportJobId) {
    log.error('Invalid job payload: missing exportJobId');
    await boss.fail(job.id, 'Missing exportJobId');
    await boss.stop();
    process.exit(1);
    return;
  }

  try {
    // Pull full job details
    const jobDetail = await internalGetJSON(`${internalBase}/export/jobs/${exportJobId}`, internalKey);
    log.debug('Job detail loaded');

    // Mark processing
    await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
      status: 'processing',
      progress: 10
    });

    // Extract job settings
    const exportJob = jobDetail.data.exportJob;
    const duration = Math.max(3, Math.min(600, (exportJob.metadata?.timeline?.duration) || exportJob.output?.duration || 10));
    const watermarkSettings = exportJob.watermarkSettings || { enabled: true, preset: 'minimal' };
    
    log.info(`Processing export job: duration=${duration}s, watermark=${watermarkSettings.enabled ? watermarkSettings.preset : 'disabled'}`);

    // Update progress
    await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
      progress: 25
    });

    // Create temporary directory
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'flickmv-'));
    const filename = `${sanitizeFilename(exportJob.name || 'FlickMV_Export')}_${Date.now()}.mp4`;
    const outPath = path.join(tmpDir, filename);

    log.info(`Rendering video with watermark: ${outPath}`);

    // Update progress
    await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
      progress: 40
    });

    // Render video with watermark
    await renderVideoWithWatermark(outPath, duration, watermarkSettings);

    // Update progress
    await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
      progress: 70
    });

    const stats = await fsp.stat(outPath);
    log.info(`Video rendered: ${stats.size} bytes`);

    // Upload to R2 if configured
    let downloadUrl = null;
    let storage = { provider: 'local' };
    const r2Endpoint = process.env.R2_ENDPOINT;
    const r2Bucket = process.env.R2_BUCKET;
    const r2Key = `exports/${String(exportJob.userId)}/${filename}`.replace(/\\/g, '/');
    const publicBase = process.env.R2_PUBLIC_BASE_URL;

    if (r2Endpoint && r2Bucket && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      log.info('Uploading to R2:', r2Bucket, r2Key);
      
      // Update progress
      await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
        progress: 80
      });

      const s3 = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
      });

      const body = fs.createReadStream(outPath);
      await s3.send(new PutObjectCommand({
        Bucket: r2Bucket,
        Key: r2Key,
        Body: body,
        ContentType: 'video/mp4',
        ACL: undefined
      }));

      if (publicBase) {
        downloadUrl = `${publicBase.replace(/\/+$/, '')}/${r2Key}`;
      }

      storage = { provider: 's3', bucket: r2Bucket, key: r2Key };
      log.info('Upload completed');
    } else {
      log.info('R2 not configured, keeping local path only');
    }

    // Update progress
    await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
      progress: 95
    });

    // Report completion
    await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
      status: 'completed',
      progress: 100,
      output: {
        url: downloadUrl || `/exports/${String(exportJob.userId)}/${filename}`,
        filename,
        size: stats.size,
        duration,
        storage,
        watermark: {
          applied: watermarkSettings.enabled,
          preset: watermarkSettings.preset,
          timestamp: new Date().toISOString()
        }
      }
    });

    await boss.complete(job.id);
    log.info('Job completed:', job.id);

    // Cleanup
    try {
      await fsp.unlink(outPath);
      await fsp.rmdir(tmpDir, { recursive: true });
    } catch (e) {
      log.debug('Cleanup error (ignored):', e.message);
    }

    await boss.stop();
    process.exit(0);
  } catch (err) {
    log.error('Worker error:', err && (err.stack || err.message || err));
    try {
      await internalPostJSON(`${internalBase}/export/jobs/${exportJobId}/status`, internalKey, {
        status: 'failed',
        progress: 0,
        error: {
          message: String(err.message || err),
          stack: err.stack,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      log.error('Failed to report failure to internal API:', e && (e.stack || e.message || e));
    }
    try {
      await boss.fail(job.id, String(err.message || err));
    } catch {}
    await boss.stop();
    process.exit(1);
  }
}

function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 80);
}

function renderVideoWithWatermark(outPath, durationSec, watermarkSettings) {
  return new Promise((resolve, reject) => {
    const videoWidth = 1080;
    const videoHeight = 1920;
    
    // Generate watermark filter
    const watermarkFilter = generateWatermarkFilter(watermarkSettings, videoWidth, videoHeight);
    
    // Base content text
    const contentText = 'FlickMV Export Demo';
    let videoFilters = `drawtext=text='${escapeText(contentText)}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.4:boxborderw=20`;
    
    // Add watermark filter if enabled
    if (watermarkFilter) {
      videoFilters += `,${watermarkFilter}`;
      log.info(`Applying watermark: ${watermarkSettings.preset}`);
    } else {
      log.info('No watermark applied');
    }

    const ffmpegCommand = ffmpeg()
      .input(`color=c=black:s=${videoWidth}x${videoHeight}:d=${durationSec}`)
      .inputFormat('lavfi')
      .videoCodec('libx264')
      .fps(30)
      .outputOptions([
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        `-vf ${videoFilters}`
      ])
      .on('start', (cmd) => {
        log.debug('ffmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          log.debug(`Rendering progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        log.error('FFmpeg error:', err.message);
        reject(err);
      })
      .on('end', () => {
        log.info('Video rendering completed');
        resolve();
      });

    ffmpegCommand.save(outPath);
  });
}

function escapeText(t) {
  // Escape special characters for ffmpeg drawtext
  return String(t).replace(/:/g, '\\:').replace(/'/g, "\\\\'").replace(/,/g, '\\,');
}

async function internalGetJSON(url, key) {
  const res = await fetch(url, {
    headers: {
      'x-internal-key': key,
      'Content-Type': 'application/json'
    }
  });
  const json = await safeJson(res);
  if (!res.ok || (json && json.success === false)) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(`Internal GET failed: ${msg}`);
  }
  return json;
}

async function internalPostJSON(url, key, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-internal-key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });
  const json = await safeJson(res);
  if (!res.ok || (json && json.success === false)) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(`Internal POST failed: ${msg}`);
  }
  return json;
}

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
}

// Node 18+ global fetch is available
if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch');
}

main().catch((e) => {
  // Unhandled top-level
  console.error('[FATAL]', e && (e.stack || e.message || e));
  process.exit(1);
});