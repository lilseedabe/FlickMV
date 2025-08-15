const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const prisma = require('../prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { projectPermission, requireSubscription, actionRateLimit } = require('../middleware/auth');
const exportService = require('../services/exportService');

const router = express.Router();

// @route   POST /api/export/:projectId
// @desc    Create export job
// @access  Private
router.post('/:projectId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('settings.resolution').optional().isIn(['9:16', '1:1', '16:9', 'custom']).withMessage('Invalid resolution'),
    body('settings.frameRate').optional().isIn([24, 30, 60]).withMessage('Invalid frame rate'),
    body('settings.format.container').optional().isIn(['mp4', 'webm']).withMessage('Invalid container format'),
    body('settings.quality.preset').optional().isIn(['low', 'medium', 'high', 'ultra']).withMessage('Invalid quality preset')
  ],
  projectPermission('view'),
  actionRateLimit('export', 5, 60 * 60 * 1000), // 5 exports per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Fetch project (full timeline/settings are needed)
    const projectId = req.params.projectId;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        settings: true,
        timeline: true
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (!project.timeline?.clips || project.timeline.clips.length === 0) {
      throw new AppError('Project must have at least one clip to export', 400);
    }

    const { name, settings = {}, priority = 0 } = req.body;

    // Default export settings
    const defaultSettings = {
      resolution: project.settings?.resolution || '9:16',
      frameRate: project.settings?.frameRate || 30,
      format: {
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac'
      },
      quality: {
        preset: 'high',
        videoBitrate: 5000,
        audioBitrate: 192,
        crf: 23
      },
      includeAudio: true
    };

    // Apply subscription-based limitations (watermark enforcement is handled server-side via WatermarkService)
    if (req.user.subscription === 'free') {
      defaultSettings.quality.preset = 'medium';
    }

    // Merge settings
    const finalSettings = {
      ...defaultSettings,
      ...settings,
      format: { ...defaultSettings.format, ...(settings.format || {}) },
      quality: { ...defaultSettings.quality, ...(settings.quality || {}) }
    };

    // Create export job
    const exportJob = await prisma.exportJob.create({
      data: {
        legacyId: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        projectId: project.id,
        userId: req.user.id,
        name: name || `${project.name} Export`,
        settings: finalSettings,
        priority: Math.max(-10, Math.min(10, parseInt(priority, 10) || 0)),
        metadata: {
          timeline: project.timeline,
          projectSettings: project.settings,
          mediaFiles: [] // Will be populated by worker if needed
        },
        status: 'queued',
        progress: 0
      }
    });

    // Queue for processing
    await exportService.queueExport(exportJob.id);

    // Update user's export count (best-effort)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { usageExportsThisMonth: (req.user.usageExportsThisMonth || 0) + 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Export job created successfully',
      data: {
        exportJob,
        estimatedTime: estimateExportTime(project.timeline.duration, finalSettings)
      }
    });
  })
);

// @route   GET /api/export/jobs
// @desc    Get user's export jobs
// @access  Private
router.get('/jobs',
  [
    query('status').optional().isIn(['queued', 'processing', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [exportJobs, total] = await Promise.all([
      prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: { project: { select: { name: true } } }
      }),
      prisma.exportJob.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        exportJobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  })
);

// @route   GET /api/export/jobs/:id
// @desc    Get single export job
// @access  Private
router.get('/jobs/:id',
  param('id').isUUID().withMessage('Invalid export job ID'),
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { name: true, description: true } },
        user: { select: { name: true, email: true } }
      }
    });

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: { exportJob: job }
    });
  })
);

// @route   POST /api/export/jobs/:id/cancel
// @desc    Cancel export job
// @access  Private
router.post('/jobs/:id/cancel',
  param('id').isUUID().withMessage('Invalid export job ID'),
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findUnique({ where: { id: req.params.id } });

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    // Only queued/processing can be cancelled
    if (!['queued', 'processing'].includes(job.status)) {
      throw new AppError('Cannot cancel this export job', 400);
    }

    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: 'cancelled' }
    });

    await exportService.cancelJob(job.id);

    res.json({
      success: true,
      message: 'Export job cancelled successfully'
    });
  })
);

// @route   POST /api/export/jobs/:id/retry
// @desc    Retry failed export job
// @access  Private
router.post('/jobs/:id/retry',
  param('id').isUUID().withMessage('Invalid export job ID'),
  actionRateLimit('retry-export', 3, 60 * 60 * 1000), // 3 retries per hour
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findUnique({ where: { id: req.params.id } });

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    if (job.status !== 'failed') {
      throw new AppError('Only failed jobs can be retried', 400);
    }

    await prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'queued',
        progress: 0,
        processing: {
          retryCount: (job.processing?.retryCount || 0) + 1,
          maxRetries: job.processing?.maxRetries || 3
        }
      }
    });

    await exportService.queueExport(job.id);

    res.json({
      success: true,
      message: 'Export job queued for retry'
    });
  })
);

// @route   DELETE /api/export/jobs/:id
// @desc    Delete export job
// @access  Private
router.delete('/jobs/:id',
  param('id').isUUID().withMessage('Invalid export job ID'),
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findUnique({ where: { id: req.params.id } });

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    // Can only delete completed, failed, or cancelled jobs
    if (['queued', 'processing'].includes(job.status)) {
      throw new AppError('Cannot delete active export job. Cancel it first.', 400);
    }

    // Delete output files if local and filename present
    if (job.output?.url) {
      await exportService.deleteOutputFiles(job.id);
    }

    await prisma.exportJob.delete({ where: { id: job.id } });

    res.json({
      success: true,
      message: 'Export job deleted successfully'
    });
  })
);

// @route   GET /api/export/jobs/:id/download
// @desc    Download export result (local files or redirect to remote URL)
// @access  Private
router.get('/jobs/:id/download',
  param('id').isUUID().withMessage('Invalid export job ID'),
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findUnique({ where: { id: req.params.id } });

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    if (job.status !== 'completed') {
      throw new AppError('Export is not completed yet', 400);
    }

    if (!job.output?.url) {
      throw new AppError('Export file not available', 404);
    }

    // If output is remote (R2/HTTP), redirect
    if (/^https?:\/\//i.test(job.output.url)) {
      // Optional: track download
      await prisma.exportJob.update({
        where: { id: job.id },
        data: {
          analytics: {
            ...(job.analytics || {}),
            downloadCount: (job.analytics?.downloadCount || 0) + 1,
            lastDownloaded: new Date()
          }
        }
      });
      return res.redirect(job.output.url);
    }

    // Local download
    const filePath = require('path').join(__dirname, '../exports', String(job.userId), job.output.filename);
    try {
      await require('fs').promises.access(filePath);
    } catch {
      throw new AppError('File not found on server', 404);
    }

    // Increment download count
    await prisma.exportJob.update({
      where: { id: job.id },
      data: {
        analytics: {
          ...(job.analytics || {}),
          downloadCount: (job.analytics?.downloadCount || 0) + 1,
          lastDownloaded: new Date()
        }
      }
    });

    res.download(filePath, job.output.filename);
  })
);

// @route   GET /api/export/queue
// @desc    Get export queue status
// @access  Private
router.get('/queue',
  requireSubscription('pro'), // Pro feature
  asyncHandler(async (req, res) => {
    const queueStats = await exportService.getQueueStats();

    res.json({
      success: true,
      data: { queue: queueStats }
    });
  })
);

// @route   GET /api/export/presets
// @desc    Get export presets
// @access  Private
router.get('/presets',
  asyncHandler(async (req, res) => {
    const presets = {
      resolutions: [
        { 
          value: '9:16', 
          label: 'Vertical (9:16)', 
          dimensions: { width: 1080, height: 1920 },
          description: 'Perfect for Instagram Stories, TikTok, YouTube Shorts'
        },
        { 
          value: '1:1', 
          label: 'Square (1:1)', 
          dimensions: { width: 1080, height: 1080 },
          description: 'Instagram posts, Facebook posts'
        },
        { 
          value: '16:9', 
          label: 'Horizontal (16:9)', 
          dimensions: { width: 1920, height: 1080 },
          description: 'YouTube videos, presentations, TV'
        }
      ],
      qualities: [
        { value: 'low', label: 'Low (Fast)', bitrate: 1000, description: 'Quick preview quality' },
        { value: 'medium', label: 'Medium', bitrate: 3000, description: 'Good for social media' },
        { value: 'high', label: 'High', bitrate: 5000, description: 'Professional quality' },
        { value: 'ultra', label: 'Ultra (Slow)', bitrate: 8000, description: 'Maximum quality' }
      ],
      frameRates: [
        { value: 24, label: '24 FPS', description: 'Cinematic' },
        { value: 30, label: '30 FPS', description: 'Standard' },
        { value: 60, label: '60 FPS', description: 'Smooth motion' }
      ],
      formats: [
        { value: 'mp4', label: 'MP4', description: 'Universal compatibility' },
        { value: 'webm', label: 'WebM', description: 'Web optimized' }
      ]
    };

    res.json({
      success: true,
      data: { presets }
    });
  })
);

// Helper function to estimate export time
function estimateExportTime(duration, settings) {
  // Base time: 2x real-time for high quality
  let multiplier = 2;

  switch (settings.quality?.preset) {
    case 'low':
      multiplier = 0.5;
      break;
    case 'medium':
      multiplier = 1;
      break;
    case 'high':
      multiplier = 2;
      break;
    case 'ultra':
      multiplier = 4;
      break;
  }

  const estimatedSeconds = (duration || 0) * multiplier;

  if (estimatedSeconds < 60) {
    return `${Math.round(estimatedSeconds)} seconds`;
  } else if (estimatedSeconds < 3600) {
    return `${Math.round(estimatedSeconds / 60)} minutes`;
  } else {
    const hours = Math.floor(estimatedSeconds / 3600);
    const minutes = Math.round((estimatedSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

module.exports = router;