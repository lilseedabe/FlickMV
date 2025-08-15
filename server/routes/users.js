const express = require('express');
const { body, query, validationResult } = require('express-validator');

const prisma = require('../prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { adminMiddleware, actionRateLimit } = require('../middleware/auth');

const router = express.Router();

// Helpers
const toNumber = (v) => {
  try {
    if (typeof v === 'bigint') return Number(v);
    return typeof v === 'number' ? v : 0;
  } catch {
    return 0;
  }
};

const getSubscriptionLimits = (subscription) => {
  const limits = {
    free: {
      storage: 1024 * 1024 * 1024, // 1GB
      projects: 3,
      exports: 5
    },
    pro: {
      storage: 50 * 1024 * 1024 * 1024, // 50GB
      projects: 50,
      exports: 100
    },
    enterprise: {
      storage: 500 * 1024 * 1024 * 1024, // 500GB
      projects: 1000,
      exports: 1000
    }
  };
  return limits[subscription] || limits.free;
};

// @route   GET /api/users/profile
// @desc    Get user profile with stats
// @access  Private
router.get('/profile',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Projects by status
    const projectStats = await prisma.project.groupBy({
      by: ['status'],
      where: { ownerId: userId },
      _count: { _all: true }
    });

    // Media by type with total size
    const mediaGroup = await prisma.mediaFile.groupBy({
      by: ['type'],
      where: { ownerId: userId },
      _count: { _all: true },
      _sum: { size: true }
    });

    // Export jobs by status
    const exportStats = await prisma.exportJob.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true }
    });

    const stats = {
      projects: {
        total: projectStats.reduce((sum, s) => sum + (s._count?._all || 0), 0),
        byStatus: Object.fromEntries(projectStats.map(s => [s.status, s._count?._all || 0]))
      },
      media: {
        total: mediaGroup.reduce((sum, s) => sum + (s._count?._all || 0), 0),
        totalSize: mediaGroup.reduce((sum, s) => sum + toNumber(s._sum?.size || 0), 0),
        byType: Object.fromEntries(
          mediaGroup.map(s => [
            s.type,
            { count: s._count?._all || 0, size: toNumber(s._sum?.size || 0) }
          ])
        )
      },
      exports: {
        total: exportStats.reduce((sum, s) => sum + (s._count?._all || 0), 0),
        byStatus: Object.fromEntries(exportStats.map(s => [s.status, s._count?._all || 0]))
      }
    };

    res.json({
      success: true,
      data: {
        user: req.user,
        stats
      }
    });
  })
);

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences',
  [
    body('theme').optional().isIn(['light', 'dark', 'auto']).withMessage('Invalid theme'),
    body('defaultResolution').optional().isIn(['9:16', '1:1', '16:9']).withMessage('Invalid resolution'),
    body('autoSave').optional().isBoolean().withMessage('autoSave must be boolean'),
    body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Invalid language code')
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

    const { theme, defaultResolution, autoSave, language } = req.body;

    const current = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { preferences: true }
    });

    const merged = {
      ...(current?.preferences || {}),
      ...(theme ? { theme } : {}),
      ...(defaultResolution ? { defaultResolution } : {}),
      ...(typeof autoSave === 'boolean' ? { autoSave } : {}),
      ...(language ? { language } : {})
    };

    await prisma.user.update({
      where: { id: req.user.id },
      data: { preferences: merged }
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences: merged }
    });
  })
);

// @route   GET /api/users/activity
// @desc    Get user activity log
// @access  Private
router.get('/activity',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('type').optional().isIn(['project', 'media', 'export']).withMessage('Invalid activity type')
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

    const { page = 1, limit = 50, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = [];

    if (!type || type === 'project') {
      const recentProjects = await prisma.project.findMany({
        where: { ownerId: req.user.id },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit),
        select: { name: true, updatedAt: true, status: true }
      });

      activities.push(...recentProjects.map(p => ({
        type: 'project',
        action: 'updated',
        resource: p.name,
        timestamp: p.updatedAt,
        metadata: { status: p.status }
      })));
    }

    if (!type || type === 'export') {
      const recentExports = await prisma.exportJob.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        select: {
          name: true,
          status: true,
          createdAt: true,
          project: { select: { name: true } }
        }
      });

      activities.push(...recentExports.map(ej => ({
        type: 'export',
        action: 'created',
        resource: ej.name,
        timestamp: ej.createdAt,
        metadata: { status: ej.status, project: ej.project?.name }
      })));
    }

    // Sort and paginate
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const paginated = activities.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: paginated,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.length,
          pages: Math.ceil(activities.length / parseInt(limit))
        }
      }
    });
  })
);

// @route   GET /api/users/usage
// @desc    Get detailed usage statistics
// @access  Private
router.get('/usage',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current month usage
    const storageAgg = await prisma.mediaFile.aggregate({
      where: { ownerId: userId },
      _sum: { size: true },
      _count: { _all: true }
    });
    const exportsThisMonth = await prisma.exportJob.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth }
      }
    });
    const projectsCount = await prisma.project.count({ where: { ownerId: userId } });

    const limits = getSubscriptionLimits(req.user.subscription);

    const usedStorage = toNumber(storageAgg._sum?.size || 0);

    const usage = {
      storage: {
        used: usedStorage,
        limit: limits.storage,
        percentage: usedStorage ? Math.round((usedStorage / limits.storage) * 100) : 0
      },
      projects: {
        used: projectsCount,
        limit: limits.projects,
        percentage: Math.round((projectsCount / limits.projects) * 100)
      },
      exports: {
        used: exportsThisMonth,
        limit: limits.exports,
        percentage: Math.round((exportsThisMonth / limits.exports) * 100)
      }
    };

    res.json({
      success: true,
      data: { usage, subscription: req.user.subscription }
    });
  })
);

// @route   DELETE /api/users/data
// @desc    Delete all user data
// @access  Private
router.delete('/data',
  [
    body('confirmation').equals('DELETE ALL DATA').withMessage('Must confirm with "DELETE ALL DATA"'),
    body('password').notEmpty().withMessage('Password required')
  ],
  actionRateLimit('delete-data', 1, 24 * 60 * 60 * 1000), // 1 attempt per 24 hours
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Verify password via /auth route patterns
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true }
    });
    if (!user || !user.password) {
      throw new AppError('Password is incorrect', 400);
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      throw new AppError('Password is incorrect', 400);
    }

    // Delete all user data in transaction
    await prisma.$transaction(async (tx) => {
      await tx.project.deleteMany({ where: { ownerId: req.user.id } });
      await tx.mediaFile.deleteMany({ where: { ownerId: req.user.id } });
      await tx.exportJob.deleteMany({ where: { userId: req.user.id } });

      await tx.user.update({
        where: { id: req.user.id },
        data: {
          usageProjectsCount: 0,
          usageStorageUsed: BigInt(0),
          usageExportsThisMonth: 0
        }
      });
    });

    res.json({
      success: true,
      message: 'All user data deleted successfully'
    });
  })
);

// @route   POST /api/users/feedback
// @desc    Submit user feedback
// @access  Private
router.post('/feedback',
  [
    body('type').isIn(['bug', 'feature', 'general']).withMessage('Invalid feedback type'),
    body('subject').trim().isLength({ min: 5, max: 100 }).withMessage('Subject must be 5-100 characters'),
    body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be 10-1000 characters'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5')
  ],
  actionRateLimit('feedback', 5, 24 * 60 * 60 * 1000), // 5 feedback per day
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, subject, message, rating } = req.body;

    // TODO: Store feedback table via Prisma if needed
    console.log('User Feedback:', {
      userId: req.user.id,
      userEmail: req.user.email,
      type,
      subject,
      message,
      rating,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for helping us improve!'
    });
  })
);

// Admin routes
// @route   GET /api/users/admin/all
// @desc    Get all users (admin only)
// @access  Admin
router.get('/admin/all',
  adminMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('subscription').optional().isIn(['free', 'pro', 'enterprise']).withMessage('Invalid subscription'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
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

    const { page = 1, limit = 50, subscription, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (subscription) where.subscription = subscription;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          subscription: true,
          isActive: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
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

module.exports = router;