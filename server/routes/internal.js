const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Internal API middleware
const requireInternalKey = (req, res, next) => {
  const internalKey = req.headers['x-internal-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message: 'Internal API not configured'
    });
  }
  
  if (!internalKey || internalKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid internal API key'
    });
  }
  
  next();
};

// @route   GET /api/internal/export/jobs/:id
// @desc    Get export job details (internal)
// @access  Internal
router.get('/export/jobs/:id',
  requireInternalKey,
  param('id').isUUID().withMessage('Invalid export job ID'),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const exportJob = await prisma.exportJob.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            settings: true,
            timeline: true
          }
        },
        user: {
          select: {
            id: true,
            plan: true,
            subscription: true
          }
        }
      }
    });

    if (!exportJob) {
      return res.status(404).json({
        success: false,
        message: 'Export job not found'
      });
    }

    res.json({
      success: true,
      data: { exportJob }
    });
  })
);

// @route   POST /api/internal/export/jobs/:id/status
// @desc    Update export job status and progress (internal)
// @access  Internal
router.post('/export/jobs/:id/status',
  requireInternalKey,
  [
    param('id').isUUID().withMessage('Invalid export job ID'),
    body('status').optional().isIn(['queued', 'processing', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
    body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
    body('output').optional().isObject().withMessage('Output must be an object'),
    body('processing').optional().isObject().withMessage('Processing must be an object'),
    body('completedAt').optional().isISO8601().withMessage('Invalid completed date'),
    body('failedAt').optional().isISO8601().withMessage('Invalid failed date')
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

    const jobId = req.params.id;
    const updateData = {};

    // Extract valid fields
    const { status, progress, output, processing, completedAt, failedAt } = req.body;

    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (output !== undefined) updateData.output = output;
    if (processing !== undefined) updateData.processing = processing;
    if (completedAt !== undefined) updateData.completedAt = new Date(completedAt);
    if (failedAt !== undefined) updateData.failedAt = new Date(failedAt);

    // Always update updatedAt
    updateData.updatedAt = new Date();

    const exportJob = await prisma.exportJob.update({
      where: { id: jobId },
      data: updateData,
      select: {
        id: true,
        status: true,
        progress: true,
        output: true,
        processing: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: { exportJob }
    });
  })
);

// @route   POST /api/internal/export/jobs/:id/progress
// @desc    Update export job progress with detailed info (internal)
// @access  Internal
router.post('/export/jobs/:id/progress',
  requireInternalKey,
  [
    param('id').isUUID().withMessage('Invalid export job ID'),
    body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
    body('phase').optional().isString().withMessage('Phase must be a string'),
    body('message').optional().isString().withMessage('Message must be a string'),
    body('details').optional().isObject().withMessage('Details must be an object')
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

    const jobId = req.params.id;
    const { progress, phase, message, details } = req.body;

    // Get current processing data
    const currentJob = await prisma.exportJob.findUnique({
      where: { id: jobId },
      select: { processing: true }
    });

    const updatedProcessing = {
      ...(currentJob?.processing || {}),
      currentStep: phase,
      message,
      details,
      lastUpdate: new Date().toISOString()
    };

    const exportJob = await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        progress,
        processing: updatedProcessing,
        updatedAt: new Date()
      },
      select: {
        id: true,
        progress: true,
        processing: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: { exportJob }
    });
  })
);

// @route   POST /api/internal/export/jobs/:id/error
// @desc    Report export job error (internal)
// @access  Internal
router.post('/export/jobs/:id/error',
  requireInternalKey,
  [
    param('id').isUUID().withMessage('Invalid export job ID'),
    body('error').isObject().withMessage('Error must be an object'),
    body('error.message').isString().withMessage('Error message is required'),
    body('error.stack').optional().isString().withMessage('Error stack must be a string'),
    body('error.code').optional().isString().withMessage('Error code must be a string')
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

    const jobId = req.params.id;
    const { error } = req.body;

    const exportJob = await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        progress: 0,
        processing: {
          error: {
            ...error,
            timestamp: new Date().toISOString()
          }
        },
        failedAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: { exportJob }
    });
  })
);

// @route   GET /api/internal/export/queue/stats
// @desc    Get export queue statistics (internal)
// @access  Internal
router.get('/export/queue/stats',
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const [queued, processing, completed, failed, cancelled] = await Promise.all([
      prisma.exportJob.count({ where: { status: 'queued' } }),
      prisma.exportJob.count({ where: { status: 'processing' } }),
      prisma.exportJob.count({ where: { status: 'completed' } }),
      prisma.exportJob.count({ where: { status: 'failed' } }),
      prisma.exportJob.count({ where: { status: 'cancelled' } })
    ]);

    const stats = {
      waiting: queued,
      active: processing,
      completed,
      failed,
      cancelled,
      total: queued + processing + completed + failed + cancelled
    };

    res.json({
      success: true,
      data: { stats }
    });
  })
);

// @route   GET /api/internal/export/jobs
// @desc    Get export jobs with filtering (internal)
// @access  Internal
router.get('/export/jobs',
  requireInternalKey,
  asyncHandler(async (req, res) => {
    const { status, userId, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [jobs, total] = await Promise.all([
      prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
        include: {
          user: {
            select: { id: true, name: true, plan: true }
          },
          project: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.exportJob.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  })
);

// @route   POST /api/internal/export/cleanup
// @desc    Cleanup old export jobs (internal)
// @access  Internal
router.post('/export/cleanup',
  requireInternalKey,
  [
    body('olderThanDays').optional().isInt({ min: 1 }).withMessage('olderThanDays must be positive'),
    body('maxJobs').optional().isInt({ min: 1 }).withMessage('maxJobs must be positive'),
    body('dryRun').optional().isBoolean().withMessage('dryRun must be boolean')
  ],
  asyncHandler(async (req, res) => {
    const { olderThanDays = 30, maxJobs = 1000, dryRun = false } = req.body;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const jobsToCleanup = await prisma.exportJob.findMany({
      where: {
        AND: [
          {
            OR: [
              { status: 'completed' },
              { status: 'failed' },
              { status: 'cancelled' }
            ]
          },
          { createdAt: { lt: cutoffDate } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: maxJobs,
      select: { id: true, userId: true, status: true, createdAt: true, output: true }
    });

    if (dryRun) {
      return res.json({
        success: true,
        data: {
          dryRun: true,
          jobsToCleanup: jobsToCleanup.length,
          jobs: jobsToCleanup
        }
      });
    }

    // Actually delete jobs
    const deletedJobs = [];
    for (const job of jobsToCleanup) {
      try {
        await prisma.exportJob.delete({ where: { id: job.id } });
        deletedJobs.push(job.id);
      } catch (error) {
        console.error(`Failed to delete job ${job.id}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        dryRun: false,
        jobsFound: jobsToCleanup.length,
        jobsDeleted: deletedJobs.length,
        deletedJobs
      }
    });
  })
);

module.exports = router;