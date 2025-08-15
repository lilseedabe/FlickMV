const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const prisma = require('../prisma/client');

class MediaService {
  constructor() {
    // Set FFmpeg paths if specified in environment
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  // ===== New public APIs (Prisma) =====

  /**
   * Process uploaded media file by ID (extract metadata, thumbnail, validate)
   * @param {string} mediaFileId - UUID
   */
  async processFileById(mediaFileId) {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId }
    });
    if (!mediaFile) throw new Error('Media file not found');

    // Update status: processing
    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: {
        processing: {
          ...(mediaFile.processing || {}),
          status: 'processing',
          progress: 10
        }
      }
    });

    const filePath = this.getFilePathFromRecord(mediaFile);

    try {
      // Extract metadata
      const extracted = await this.extractMetadataToJson(mediaFile, filePath);
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          ...extracted,
          processing: {
            ...(mediaFile.processing || {}),
            status: 'processing',
            progress: 40
          }
        }
      });

      // Generate thumbnail/waveform
      const thumbnail = await this.generateThumbnail(mediaFile, filePath);
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          ...(thumbnail ? { thumbnail } : {}),
          processing: {
            ...(mediaFile.processing || {}),
            status: 'processing',
            progress: 70
          }
        }
      });

      // Validate file exists/size and is decodable (best-effort)
      await this.validateFile(mediaFile, filePath);
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          processing: {
            ...(mediaFile.processing || {}),
            status: 'processing',
            progress: 90
          }
        }
      });

      // Completed
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          processing: {
            status: 'completed',
            progress: 100,
            error: null,
            thumbnailGenerated: true,
            metadataExtracted: true
          }
        }
      });

      console.log(`Media file processed successfully: ${mediaFile.id}`);
    } catch (error) {
      console.error(`Error processing media file ${mediaFile.id}:`, error);
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          processing: {
            ...(mediaFile.processing || {}),
            status: 'failed',
            error: String(error.message || error)
          }
        }
      });
      throw error;
    }
  }

  /**
   * Analyze media file by ID for AI features (BPM etc.)
   * @param {string} mediaFileId - UUID
   */
  async analyzeFileById(mediaFileId) {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId }
    });
    if (!mediaFile) throw new Error('Media file not found');

    const filePath = this.getFilePathFromRecord(mediaFile);

    try {
      let updates = {};
      if (mediaFile.type === 'audio') {
        const audioAnalysis = await this.analyzeBPMToJson(filePath, mediaFile);
        updates.analysis = {
          ...(mediaFile.analysis || {}),
          ...audioAnalysis
        };
      } else if (mediaFile.type === 'image') {
        const imageAnalysis = await this.analyzeImageToJson(filePath);
        updates.analysis = {
          ...(mediaFile.analysis || {}),
          ...imageAnalysis
        };
      } else if (mediaFile.type === 'video') {
        const videoAnalysis = await this.analyzeVideoToJson(mediaFile);
        updates.analysis = {
          ...(mediaFile.analysis || {}),
          ...videoAnalysis
        };
      }

      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: updates
      });

      console.log(`Media file analyzed: ${mediaFile.id}`);
    } catch (error) {
      console.error(`Error analyzing media file ${mediaFile.id}:`, error);
      throw error;
    }
  }

  // ===== Internal helpers (Prisma-agnostic JSON builders) =====

  /**
   * Extract metadata from media file and return JSON patch for Prisma update
   * @param {any} mediaFile
   * @param {string} filePath
   * @returns {Promise<{dimensions?: any, metadata?: any, duration?: number}>}
   */
  async extractMetadataToJson(mediaFile, filePath) {
    if (mediaFile.type === 'image') {
      // Use sharp for images
      const meta = await sharp(filePath).metadata();
      const dimensions = {
        width: meta.width || null,
        height: meta.height || null
      };
      const metadata = {
        ...(mediaFile.metadata || {}),
        colorSpace: meta.space || null,
        orientation: meta.orientation || 1
      };
      return { dimensions, metadata };
    }

    // Use ffprobe for video/audio
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);

        const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams?.find(s => s.codec_type === 'audio');

        const patch = {};
        patch.dimensions = {
          width: videoStream?.width || null,
          height: videoStream?.height || null
        };

        const md = { ...(mediaFile.metadata || {}) };
        if (videoStream) {
          md.fps = this.parseFrameRate(videoStream.r_frame_rate);
          md.codec = videoStream.codec_name || md.codec || null;
          md.bitrate = parseInt(videoStream.bit_rate) || md.bitrate || null;
        }
        if (audioStream) {
          md.channels = audioStream.channels || md.channels || null;
          md.sampleRate = audioStream.sample_rate || md.sampleRate || null;
          md.codec = audioStream.codec_name || md.codec || null;
          md.bitrate = parseInt(audioStream.bit_rate) || md.bitrate || null;
        }
        patch.metadata = md;

        if (metadata.format?.duration) {
          patch.duration = parseFloat(metadata.format.duration);
        }

        resolve(patch);
      });
    });
  }

  /**
   * Generate thumbnail/waveform and return thumbnail URL (if created)
   * @param {any} mediaFile
   * @param {string} filePath
   * @returns {Promise<string|null>}
   */
  async generateThumbnail(mediaFile, filePath) {
    const ownerId = mediaFile.ownerId;
    const thumbnailDir = path.join(path.dirname(filePath), 'thumbnails');
    await fs.mkdir(thumbnailDir, { recursive: true });

    const base = path.basename(filePath, path.extname(filePath));
    const thumbnailFilename = `thumb_${base}.jpg`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    if (mediaFile.type === 'image') {
      await sharp(filePath).resize(300, 300, { fit: 'cover', position: 'center' }).jpeg({ quality: 80 }).toFile(thumbnailPath);
      return `/uploads/${ownerId}/thumbnails/${thumbnailFilename}`;
    }

    if (mediaFile.type === 'video') {
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            count: 1,
            folder: thumbnailDir,
            filename: thumbnailFilename,
            size: '300x300'
          })
          .on('end', resolve)
          .on('error', reject);
      });
      return `/uploads/${ownerId}/thumbnails/${thumbnailFilename}`;
    }

    if (mediaFile.type === 'audio') {
      // Generate simple waveform visualization
      await this.generateWaveform(filePath, thumbnailPath);
      return `/uploads/${ownerId}/thumbnails/${thumbnailFilename}`;
    }

    return null;
  }

  /**
   * Validate file (exists, size matches; decode for av files)
   * @param {any} mediaFile
   * @param {string} filePath
   */
  async validateFile(mediaFile, filePath) {
    // File exists
    await fs.access(filePath);

    // Size check (best-effort, fs.stat used)
    const stats = await fs.stat(filePath);
    if (typeof mediaFile.size === 'number') {
      if (stats.size !== mediaFile.size) {
        throw new Error('File size mismatch');
      }
    } else {
      // Prisma BigInt -> JS BigInt or number; convert to Number safely for compare
      const dbSize = Number(mediaFile.size || 0);
      if (stats.size !== dbSize) {
        throw new Error('File size mismatch');
      }
    }

    // For video/audio ensure ffprobe can read
    if (mediaFile.type === 'video' || mediaFile.type === 'audio') {
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err) => (err ? reject(new Error('Invalid media file')) : resolve()));
      });
    }
  }

  /**
   * Generate waveform visualization for audio files
   * @param {string} audioPath
   * @param {string} outputPath
   */
  async generateWaveform(audioPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .audioFilters('showwavespic=s=300x150:colors=0x3b82f6')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Audio BPM analysis (placeholder)
   * @param {string} filePath
   * @param {any} mediaFile
   * @returns {Promise<any>} analysis JSON
   */
  async analyzeBPMToJson(filePath, mediaFile) {
    // Simplified placeholder; implement real BPM analysis with specialized lib if needed
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioFilters('dynaudnorm,lowpass=3000,highpass=100')
        .format('wav')
        .on('error', reject)
        .on('end', resolve)
        .saveToFile(path.join(path.dirname(filePath), 'tmp_bpm.wav'));
    }).catch(() => {});

    const bpm = 120 + Math.random() * 60;
    const tempo = bpm > 140 ? 'fast' : 'medium';
    const duration = mediaFile.duration || 60;
    const beatsPerSecond = bpm / 60;
    const beats = [];
    for (let i = 0; i < duration * beatsPerSecond; i++) {
      beats.push({
        time: i / beatsPerSecond,
        confidence: 0.7 + Math.random() * 0.3
      });
    }

    return {
      bpm,
      tempo,
      beats
    };
  }

  /**
   * Image analysis placeholder (dominant color)
   * @param {string} filePath
   * @returns {Promise<any>}
   */
  async analyzeImageToJson(filePath) {
    try {
      const { dominant } = await sharp(filePath).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
      const hex = '#' + Array.from(dominant.data).map(x => x.toString(16).padStart(2, '0')).join('');
      return {
        dominantColors: [hex],
        objects: [
          {
            name: 'background',
            confidence: 0.9,
            boundingBox: { x: 0, y: 0, width: 1, height: 1 }
          }
        ]
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      return {};
    }
  }

  /**
   * Video analysis placeholder (simple scenes)
   * @param {any} mediaFile
   * @returns {Promise<any>}
   */
  async analyzeVideoToJson(mediaFile) {
    const dur = mediaFile.duration || 10;
    return {
      scenes: [
        { start: 0, end: dur / 2, type: 'static' },
        { start: dur / 2, end: dur, type: 'dynamic' }
      ]
    };
  }

  /**
   * Resolve uploads file path for a media record
   * @param {any} mediaFile
   * @returns {string}
   */
  getFilePathFromRecord(mediaFile) {
    return path.join(
      __dirname,
      '../uploads',
      String(mediaFile.ownerId),
      mediaFile.storage?.key || ''
    );
  }

  /**
   * Parse ffmpeg frame rate formats like "30/1"
   * @param {string} frameRateStr
   * @returns {number|null}
   */
  parseFrameRate(frameRateStr) {
    if (!frameRateStr) return null;
    const parts = String(frameRateStr).split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]) || 1;
      return num / den;
    }
    const val = parseFloat(frameRateStr);
    return isNaN(val) ? null : val;
  }
}

module.exports = new MediaService();