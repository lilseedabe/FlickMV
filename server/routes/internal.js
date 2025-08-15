const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const exportService = require('../services/exportService');
const WatermarkService = require('../services/watermarkService');
const prisma = require('../prisma/client');

const router = express.Router();

// Internal authentication strategy:
// - If INTERNAL_API_KEY is provided, prefer header-based auth for machine clients (e.g., worker).
// - Otherwise, fall back to user auth + admin role (or enterprise subscription).
const internalKey = process.env.INTERNAL_API_KEY;

if (internalKey) {
  router.use((req, res, next) => {
    const key = req.get('x-internal-key');
    if (key && key === internalKey) return next();
    return res.status(401).json({
      success: false,
      message: 'Unauthorized internal access'
    });
  });
} else {
  router.use(authMiddleware, adminMiddleware);
}

// @route   GET /api/internal/queue-length
// @desc    Get current export queue length (aggregated via ExportJob status)
// @access  Internal/Admin
router.get('/queue-length', asyncHandler(async (req, res) => {
  const stats = await exportService.getQueueStats();
  return res.json({
    success: true,
    data: {
      waiting: stats.waiting,
      active: stats.active,
      total: stats.waiting + stats.active
    }
  });
}));

// @route   GET /api/internal/queue-stats
// @desc    Get detailed export queue stats
// @access  Internal/Admin
router.get('/queue-stats', asyncHandler(async (req, res) => {
  const stats = await exportService.getQueueStats();
  return res.json({
    success: true,
    data: { queue: stats }
  });
}));

// @route   GET /api/internal/export/jobs/:id
// @desc    Get full export job details for worker (includes project & user basic fields)
// @access  Internal/Admin
router.get('/export/jobs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await prisma.exportJob.findUnique({
    where: { id },
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
          name: true,
          email: true,
          plan: true,
          subscription: true
        }
      }
    }
  });

  if (!job) {
    return res.status(404).json({ success: false, message: 'Export job not found' });
  }

  return res.json({
    success: true,
    data: { exportJob: job }
  });
}));

// @route   POST /api/internal/export/jobs/:id/progress
// @desc    Update export job progress (used by worker during processing)
// @access  Internal/Admin
router.post('/export/jobs/:id/progress', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { progress = 0, currentStep = null } = req.body || {};

  const job = await prisma.exportJob.findUnique({ where: { id } });
  if (!job) {
    return res.status(404).json({ success: false, message: 'Export job not found' });
  }

  const processing = {
    ...(job.processing || {}),
    currentStep: currentStep || job.processing?.currentStep || null,
    lastUpdated: new Date().toISOString()
  };

  const updated = await prisma.exportJob.update({
    where: { id },
    data: {
      progress: Math.max(0, Math.min(100, parseInt(progress, 10) || 0)),
      processing
    }
  });

  return res.json({
    success: true,
    message: 'Progress updated',
    data: { exportJob: updated }
  });
}));

// @route   POST /api/internal/export/jobs/:id/status
// @desc    Finalize export job status and attach output metadata (used by worker on completion/failure)
// @access  Internal/Admin
router.post('/export/jobs/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, error, output, progress } = req.body || {};

  const job = await prisma.exportJob.findUnique({ where: { id } });
  if (!job) {
    return res.status(404).json({ success: false, message: 'Export job not found' });
  }

  let data = {
    updatedAt: new Date()
  };

  // Update progress if provided
  if (typeof progress === 'number') {
    data.progress = Math.max(0, Math.min(100, progress));
  }

  switch (status) {
    case 'completed': {
      const prevOutput = job.output || {};
      data = {
        ...data,
        status: 'completed',
        progress: 100,
        output: { ...prevOutput, ...(output || {}) },
        completedAt: new Date()
      };
      break;
    }
    case 'failed': {
      const processing = {
        ...(job.processing || {}),
        error: {
          message: (error && error.message) || 'Export failed',
          stack: error && error.stack,
          code: error && error.code,
          timestamp: new Date().toISOString()
        }
      };
      data = {
        ...data,
        status: 'failed',
        processing,
        failedAt: new Date()
      };
      break;
    }
    case 'cancelled': {
      data = {
        ...data,
        status: 'cancelled',
        cancelledAt: new Date()
      };
      break;
    }
    case 'processing': {
      const processing = {
        ...(job.processing || {}),
        startedAt: job.processing?.startedAt || new Date().toISOString()
      };
      data = {
        ...data,
        status: 'processing',
        processing,
        progress: data.progress || 0
      };
      break;
    }
    default: {
      if (typeof status === 'string') {
        data.status = status;
      }
    }
  }

  const updated = await prisma.exportJob.update({
    where: { id },
    data
  });

  return res.json({
    success: true,
    message: 'Status updated',
    data: { exportJob: updated }
  });
}));

// @route   GET /api/internal/watermark/settings/:jobId
// @desc    Get watermark settings for specific export job
// @access  Internal/Admin
router.get('/watermark/settings/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const watermarkSettings = await exportService.getWatermarkSettings(jobId);
    return res.json({
      success: true,
      data: { watermarkSettings }
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   GET /api/internal/user/:userId/export-stats
// @desc    Get user's export statistics and plan limits
// @access  Internal/Admin
router.get('/user/:userId/export-stats', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, plan: true, subscription: true }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const stats = await exportService.getUserExportStats(userId, user.plan || 'free');

  return res.json({
    success: true,
    data: {
      userId,
      userPlan: user.plan || 'free',
      exportStats: stats
    }
  });
}));

// @route   GET /api/internal/plan/features/:plan
// @desc    Get plan features and limitations
// @access  Internal/Admin
router.get('/plan/features/:plan', asyncHandler(async (req, res) => {
  const { plan } = req.params;

  const features = WatermarkService.getPlanFeatures(plan);

  return res.json({
    success: true,
    data: {
      plan,
      features
    }
  });
}));

// @route   POST /api/internal/export/jobs/:id/watermark
// @desc    Update watermark settings for export job
// @access  Internal/Admin
router.post('/export/jobs/:id/watermark', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { watermarkSettings } = req.body || {};

  const job = await prisma.exportJob.findUnique({
    where: { id },
    include: {
      user: {
        select: { plan: true }
      }
    }
  });

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Export job not found'
    });
  }

  try {
    const validatedSettings = await exportService.updateWatermarkSettings(
      id,
      watermarkSettings,
      job.user?.plan || 'free'
    );

    return res.json({
      success: true,
      message: 'Watermark settings updated',
      data: { watermarkSettings: validatedSettings }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @route   GET /api/internal/analytics/watermark-usage
// @desc    Get watermark usage analytics
// @access  Internal/Admin
router.get('/analytics/watermark-usage', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get watermark usage statistics
  const totalExports = await prisma.exportJob.count({
    where: {
      createdAt: { gte: startDate },
      status: 'completed'
    }
  });

  const watermarkedExports = await prisma.exportJob.count({
    where: {
      createdAt: { gte: startDate },
      status: 'completed',
      watermarkSettings: {
        path: ['enabled'],
        equals: true
      }
    }
  });

  // Get exports by plan
  const exportsByPlan = await prisma.exportJob.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: startDate },
      status: 'completed'
    },
    _count: {
      id: true
    }
  });

  // Get user plans for the above exports
  const userIds = exportsByPlan.map(item => item.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, plan: true }
  });

  const planStats = {};
  exportsByPlan.forEach(item => {
    const user = users.find(u => u.id === item.userId);
    const plan = user?.plan || 'free';
    planStats[plan] = (planStats[plan] || 0) + item._count.id;
  });

  return res.json({
    success: true,
    data: {
      period: `${days} days`,
      totalExports,
      watermarkedExports,
      watermarkRate: totalExports > 0 ? (watermarkedExports / totalExports * 100).toFixed(1) : 0,
      exportsByPlan: planStats
    }
  });
}));

// @route   POST /api/internal/export/validate-limits
// @desc    Validate if user can export based on plan limits
// @access  Internal/Admin
router.post('/export/validate-limits', asyncHandler(async (req, res) => {
  const { userId, userPlan } = req.body;

  if (!userId || !userPlan) {
    return res.status(400).json({
      success: false,
      message: 'userId and userPlan are required'
    });
  }

  try {
    const exportLimit = await WatermarkService.checkExportLimit(userId, userPlan);
    
    return res.json({
      success: true,
      data: exportLimit
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

module.exports = router;