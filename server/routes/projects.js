const express = require('express');
const { body, validationResult, param, query } = require('express-validator');

const prisma = require('../prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { projectPermission, requireSubscription, actionRateLimit } = require('../middleware/auth');

const router = express.Router();

// Helpers
const toProjectStatusEnum = (s) => {
  switch (s) {
    case 'in-progress':
      return 'in_progress';
    case 'draft':
    case 'completed':
    case 'archived':
      return s;
    default:
      return undefined;
  }
};

const canCreateProject = (user) => {
  switch (user.subscription) {
    case 'free':
      return (user.usageProjectsCount || 0) < 3;
    case 'pro':
      return (user.usageProjectsCount || 0) < 50;
    case 'enterprise':
      return true;
    default:
      return false;
  }
};

// @route   GET /api/projects
// @desc    Get user's projects
// @access  Private
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['draft', 'in-progress', 'completed', 'archived']).withMessage('Invalid status'),
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    // Build where
    const where = { ownerId: req.user.id };
    if (status) {
      const mapped = toProjectStatusEnum(status);
      if (mapped) where.status = mapped;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          collaborators: {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post('/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('settings.resolution')
      .optional()
      .isIn(['9:16', '1:1', '16:9', 'custom'])
      .withMessage('Invalid resolution'),
    body('settings.frameRate')
      .optional()
      .isIn([24, 30, 60])
      .withMessage('Invalid frame rate')
  ],
  actionRateLimit('create-project', 10, 60 * 60 * 1000), // 10 projects per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user can create new project
    if (!canCreateProject(req.user)) {
      throw new AppError(
        `Project limit reached for ${req.user.subscription} subscription. Please upgrade or delete existing projects.`,
        402
      );
    }

    const { name, description, settings = {} } = req.body;

    // Default project settings
    const defaultSettings = {
      resolution: '9:16',
      frameRate: 30,
      duration: 30,
      outputFormat: {
        container: 'mp4',
        videoCodec: 'h264',
        audioBitrate: 192,
        videoBitrate: 5000,
        quality: 'high'
      }
    };

    const timeline = {
      clips: [],
      audioTracks: [],
      duration: settings.duration || 30,
      zoom: 1,
      playheadPosition: 0
    };

    // Create project and update user usage in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          description: description || null,
          ownerId: req.user.id,
          settings: { ...defaultSettings, ...settings },
          timeline,
          metadata: {
            totalClips: 0,
            totalDuration: 0,
            lastEditedBy: req.user.id,
            version: 1
          }
        }
      });

      await tx.user.update({
        where: { id: req.user.id },
        data: { usageProjectsCount: (req.user.usageProjectsCount || 0) + 1 }
      });

      return project;
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project: result }
    });
  })
);

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id',
  param('id').isUUID().withMessage('Invalid project ID'),
  projectPermission('view'),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        }
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Get media library for this project
    const mediaFiles = await prisma.mediaFile.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        project,
        mediaLibrary: mediaFiles
      }
    });
  })
);

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid project ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('status')
      .optional()
      .isIn(['draft', 'in-progress', 'completed', 'archived'])
      .withMessage('Invalid status')
  ],
  projectPermission('edit'),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, status, settings, tags } = req.body;
    const projectId = req.params.id;

    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (status) data.status = toProjectStatusEnum(status);
    if (settings) {
      // Merge current settings with provided
      const current = await prisma.project.findUnique({
        where: { id: projectId },
        select: { settings: true }
      });
      data.settings = { ...(current?.settings || {}), ...settings };
    }
    if (tags) data.tags = tags;

    // Update metadata
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { metadata: true, timeline: true }
    });

    const currentMeta = currentProject?.metadata || {};
    data.metadata = {
      ...currentMeta,
      lastEditedBy: req.user.id,
      version: (currentMeta.version || 0) + 1
    };

    const updated = await prisma.project.update({
      where: { id: projectId },
      data
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updated }
    });
  })
);

// @route   PUT /api/projects/:id/timeline
// @desc    Update project timeline
// @access  Private
router.put('/:id/timeline',
  [
    param('id').isUUID().withMessage('Invalid project ID'),
    body('timeline').isObject().withMessage('Timeline must be an object'),
    body('timeline.clips').isArray().withMessage('Clips must be an array'),
    body('timeline.duration').isNumeric().withMessage('Duration must be a number')
  ],
  projectPermission('edit'),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { timeline } = req.body;
    const projectId = req.params.id;

    if (timeline.duration > 600) { // 10 minutes max
      throw new AppError('Timeline duration cannot exceed 10 minutes', 400);
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        timeline: {
          ...(timeline || {}),
          clips: timeline.clips || [],
          audioTracks: timeline.audioTracks || []
        },
        metadata: {
          totalClips: (timeline.clips || []).length,
          totalDuration: timeline.duration,
          lastEditedBy: req.user.id,
          version: 1 // Could be incremented if needed
        }
      },
      select: { timeline: true }
    });

    res.json({
      success: true,
      message: 'Timeline updated successfully',
      data: { timeline: updated.timeline }
    });
  })
);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete('/:id',
  param('id').isUUID().withMessage('Invalid project ID'),
  projectPermission('admin'), // Only owner can delete
  actionRateLimit('delete-project', 5, 60 * 60 * 1000), // 5 deletions per hour
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // Delete project (CASCADE removes collaborators and media if configured; our schema sets CASCADE on relations)
      await tx.project.delete({ where: { id: projectId } });

      // Update user's project count (best effort: decrement but not below 0)
      const user = await tx.user.findUnique({
        where: { id: req.user.id },
        select: { usageProjectsCount: true }
      });
      const nextCount = Math.max(0, (user?.usageProjectsCount || 0) - 1);
      await tx.user.update({
        where: { id: req.user.id },
        data: { usageProjectsCount: nextCount }
      });
    });

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  })
);

// @route   POST /api/projects/:id/duplicate
// @desc    Duplicate project
// @access  Private
router.post('/:id/duplicate',
  param('id').isUUID().withMessage('Invalid project ID'),
  projectPermission('view'),
  requireSubscription('pro'), // Pro feature
  asyncHandler(async (req, res) => {
    // Check if user can create new project
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { subscription: true, usageProjectsCount: true }
    });
    if (!canCreateProject(freshUser)) {
      throw new AppError(
        `Project limit reached for ${freshUser.subscription} subscription.`,
        402
      );
    }

    // Load original
    const original = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: {
        name: true,
        description: true,
        settings: true,
        timeline: true,
        tags: true
      }
    });

    if (!original) {
      throw new AppError('Project not found', 404);
    }

    const duplicate = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: `${original.name} (Copy)`,
          description: original.description,
          ownerId: req.user.id,
          settings: original.settings,
          timeline: original.timeline,
          tags: original.tags,
          metadata: {
            totalClips: (original.timeline?.clips || []).length,
            totalDuration: original.timeline?.duration || 0,
            lastEditedBy: req.user.id,
            version: 1
          }
        }
      });

      await tx.user.update({
        where: { id: req.user.id },
        data: { usageProjectsCount: (freshUser.usageProjectsCount || 0) + 1 }
      });

      return project;
    });

    res.status(201).json({
      success: true,
      message: 'Project duplicated successfully',
      data: { project: duplicate }
    });
  })
);

// @route   POST /api/projects/:id/collaborators
// @desc    Add collaborator to project
// @access  Private
router.post('/:id/collaborators',
  [
    param('id').isUUID().withMessage('Invalid project ID'),
    body('email').isEmail().withMessage('Valid email required'),
    body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Invalid role')
  ],
  projectPermission('admin'),
  requireSubscription('pro'), // Pro feature
  asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    const projectId = req.params.id;

    // Find user by email
    const collaborator = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (!collaborator) {
      throw new AppError('User not found', 404);
    }

    // Check if already a collaborator
    const exists = await prisma.collaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: collaborator.id
        }
      },
      select: { id: true }
    });

    if (exists) {
      throw new AppError('User is already a collaborator', 400);
    }

    // Add collaborator
    await prisma.collaborator.create({
      data: {
        projectId,
        userId: collaborator.id,
        role
      }
    });

    res.json({
      success: true,
      message: 'Collaborator added successfully'
    });
  })
);

module.exports = router;