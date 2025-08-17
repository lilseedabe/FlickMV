const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, param, query, validationResult } = require('express-validator');

const prisma = require('../prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { projectPermission, actionRateLimit } = require('../middleware/auth');
const mediaService = require('../services/mediaService');
const audioAnalysisService = require('../services/audioAnalysisService');
const UsageTrackingService = require('../services/usageTrackingService');

const router = express.Router();

// Configure multer for file uploads (local FS same as before)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads', req.user.id.toString());
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'video/mp4': true,
    'video/webm': true,
    'video/quicktime': true,
    'audio/mpeg': true,
    'audio/wav': true,
    'audio/mp4': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new AppError('File type not supported', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Max 10 files per request
  }
});

// @route   POST /api/media/upload/:projectId
// @desc    Upload media files
// @access  Private
router.post('/upload/:projectId',
  param('projectId').isUUID().withMessage('Invalid project ID'),
  projectPermission('edit'),
  actionRateLimit('upload', 20, 60 * 60 * 1000), // 20 uploads per hour
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.files || req.files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const projectId = req.params.projectId;
    const uploadedFiles = [];

    try {
      for (const file of req.files) {
        // Determine media type
        let mediaType;
        if (file.mimetype.startsWith('image/')) mediaType = 'image';
        else if (file.mimetype.startsWith('video/')) mediaType = 'video';
        else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
        else throw new AppError('Unsupported file type', 400);

        // Create media file record (UUID auto)
        const created = await prisma.mediaFile.create({
          data: {
            name: file.originalname,
            originalName: file.originalname,
            type: mediaType,
            format: path.extname(file.originalname).substring(1).toLowerCase(),
            url: `/uploads/${req.user.id}/${file.filename}`,
            size: BigInt(file.size),
            ownerId: req.user.id,
            projectId,
            storage: {
              provider: 'local',
              key: file.filename
            },
            processing: {
              status: 'pending',
              progress: 0
            }
          }
        });

        uploadedFiles.push(created);

        // Queue for processing (synchronous lightweight pipeline)
        // Fire & wait: processing updates DB internal states
        await mediaService.processFileById(created.id);
      }

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        data: {
          files: uploadedFiles
        }
      });

    } catch (error) {
      // Clean up uploaded files on error
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      throw error;
    }
  })
);

// @route   GET /api/media/:projectId
// @desc    Get media files for project
// @access  Private
router.get('/:projectId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    query('type').optional().isIn(['image', 'video', 'audio']).withMessage('Invalid media type'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  projectPermission('view'),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const projectId = req.params.projectId;
    const { type, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const where = { projectId };
    if (type) where.type = type;

    const [mediaFiles, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.mediaFile.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        mediaFiles,
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

// @route   GET /api/media/file/:id
// @desc    Get single media file
// @access  Private
router.get('/file/:id',
  param('id').isUUID().withMessage('Invalid media file ID'),
  asyncHandler(async (req, res) => {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Access policy: owner or public
    if (mediaFile.ownerId !== req.user.id && !mediaFile.isPublic) {
      throw new AppError('Access denied', 403);
    }

    // Update last accessed
    await prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: { lastAccessed: new Date() }
    });

    res.json({
      success: true,
      data: { mediaFile }
    });
  })
);

// @route   PUT /api/media/file/:id
// @desc    Update media file metadata
// @access  Private
router.put('/file/:id',
  [
    param('id').isUUID().withMessage('Invalid media file ID'),
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean')
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

    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Check ownership
    if (mediaFile.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    const { name, tags, isPublic } = req.body;

    const updated = await prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: {
        ...(name ? { name } : {}),
        ...(tags ? { tags } : {}),
        ...(typeof isPublic === 'boolean' ? { isPublic } : {})
      }
    });

    res.json({
      success: true,
      message: 'Media file updated successfully',
      data: { mediaFile: updated }
    });
  })
);

// @route   DELETE /api/media/file/:id
// @desc    Delete media file
// @access  Private
router.delete('/file/:id',
  param('id').isUUID().withMessage('Invalid media file ID'),
  actionRateLimit('delete-media', 20, 60 * 60 * 1000), // 20 deletions per hour
  asyncHandler(async (req, res) => {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Check ownership
    if (mediaFile.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    // Check if file is used in any timeline (quick check from project.timeline JSON)
    const project = await prisma.project.findUnique({
      where: { id: mediaFile.projectId },
      select: { timeline: true }
    });

    if (project?.timeline) {
      const usedInClips = Array.isArray(project.timeline.clips)
        ? project.timeline.clips.some(c => c.mediaId === mediaFile.id || c.mediaId === mediaFile.legacyId)
        : false;
      const usedInAudio = Array.isArray(project.timeline.audioTracks)
        ? project.timeline.audioTracks.some(t => t.mediaId === mediaFile.id || t.mediaId === mediaFile.legacyId)
        : false;

      if (usedInClips || usedInAudio) {
        throw new AppError('Cannot delete media file that is currently used in timeline', 400);
      }
    }

    // Delete physical file
    try {
      const filePath = path.join(__dirname, '../uploads', req.user.id.toString(), mediaFile.storage?.key || '');
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting physical file:', error);
    }

    // Delete database record
    await prisma.mediaFile.delete({ where: { id: mediaFile.id } });

    res.json({
      success: true,
      message: 'Media file deleted successfully'
    });
  })
);

// @route   POST /api/media/file/:id/analyze
// @desc    Analyze media file (BPM, objects, etc.)
// @access  Private
router.post('/file/:id/analyze',
  param('id').isUUID().withMessage('Invalid media file ID'),
  requireSubscription('pro'), // Pro feature
  actionRateLimit('analyze', 10, 60 * 60 * 1000), // 10 analyses per hour
  asyncHandler(async (req, res) => {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Check ownership
    if (mediaFile.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    // Perform analysis (async)
    await mediaService.analyzeFileById(mediaFile.id);

    res.json({
      success: true,
      message: 'Analysis started',
      data: { 
        mediaFileId: mediaFile.id,
        estimatedTime: mediaFile.type === 'audio' ? '30-60 seconds' : '10-30 seconds'
      }
    });
  })
);

// @route   GET /api/media/file/:id/download
// @desc    Download media file
// @access  Private
router.get('/file/:id/download',
  param('id').isUUID().withMessage('Invalid media file ID'),
  asyncHandler(async (req, res) => {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Access policy: owner or public
    if (mediaFile.ownerId !== req.user.id && !mediaFile.isPublic) {
      throw new AppError('Access denied', 403);
    }

    // Get file path
    const filePath = path.join(__dirname, '../uploads', mediaFile.ownerId.toString(), mediaFile.storage?.key || '');
    
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new AppError('File not found on server', 404);
    }

    // Increment download count
    await prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: {
        downloadCount: { increment: 1 },
        lastAccessed: new Date()
      }
    });

    // Send file
    res.download(filePath, mediaFile.name);
  })
);

// @route   POST /api/media/file/:id/audio-analyze
// @desc    Analyze audio file with Groq Whisper and MoonshotAI
// @access  Private (All plans with usage limits)
router.post('/file/:id/audio-analyze',
  [
    param('id').isUUID().withMessage('Invalid media file ID'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    body('options.genre').optional().isString().withMessage('Genre must be a string'),
    body('options.mood').optional().isString().withMessage('Mood must be a string'),
    body('options.style').optional().isString().withMessage('Style must be a string')
  ],
  actionRateLimit('audio-analyze', 10, 60 * 60 * 1000), // 10 analyses per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Check ownership
    if (mediaFile.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    // Check if it's an audio file
    if (mediaFile.type !== 'audio') {
      throw new AppError('File is not an audio file', 400);
    }

    // Check API keys
    if (!process.env.GROQ_API_KEY && !process.env.MOONSHOT_API_KEY) {
      throw new AppError('Audio analysis service is not configured', 500);
    }

    // プラン別利用制限チェック
    const usageCheck = await UsageTrackingService.checkUsageLimit(
      req.user.id,
      req.user.plan || 'free',
      'audioAnalysis'
    );

    if (!usageCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Usage limit exceeded',
        error: 'USAGE_LIMIT_EXCEEDED',
        usage: usageCheck.usage,
        limits: usageCheck.limits,
        remaining: usageCheck.remaining,
        resetDates: usageCheck.resetDates,
        upgradeRequired: req.user.plan === 'free'
      });
    }

    const options = req.body.options || {};

    // 利用回数を記録
    await UsageTrackingService.recordUsage(req.user.id, 'audioAnalysis', {
      mediaFileId: mediaFile.id,
      options,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Start analysis (async)
    audioAnalysisService.analyzeAudioFile(mediaFile.id, options)
      .catch(error => {
        console.error('Background audio analysis failed:', error);
      });

    res.json({
      success: true,
      message: 'Audio analysis started',
      data: {
        mediaFileId: mediaFile.id,
        estimatedTime: '1-2 minutes',
        status: 'processing',
        usage: {
          remaining: usageCheck.remaining,
          limits: usageCheck.limits
        }
      }
    });
  })
);

// @route   GET /api/media/file/:id/audio-analysis
// @desc    Get audio analysis result
// @access  Private
router.get('/file/:id/audio-analysis',
  param('id').isUUID().withMessage('Invalid media file ID'),
  asyncHandler(async (req, res) => {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaFile) {
      throw new AppError('Media file not found', 404);
    }

    // Check ownership
    if (mediaFile.ownerId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }

    const result = await audioAnalysisService.getAnalysisResult(mediaFile.id);
    res.json(result);
  })
);

// @route   POST /api/media/file/:id/regenerate-prompts
// @desc    Regenerate MV prompts with new options
// @access  Private (All plans with usage limits)
router.post('/file/:id/regenerate-prompts',
  [
    param('id').isUUID().withMessage('Invalid media file ID'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    body('options.genre').optional().isString().withMessage('Genre must be a string'),
    body('options.mood').optional().isString().withMessage('Mood must be a string'),
    body('options.style').optional().isString().withMessage('Style must be a string')
  ],
  actionRateLimit('regenerate-prompts', 20, 60 * 60 * 1000), // 20 regenerations per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // プラン別利用制限チェック
    const usageCheck = await UsageTrackingService.checkUsageLimit(
      req.user.id,
      req.user.plan || 'free',
      'promptRegeneration'
    );

    if (!usageCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Usage limit exceeded',
        error: 'USAGE_LIMIT_EXCEEDED',
        usage: usageCheck.usage,
        limits: usageCheck.limits,
        remaining: usageCheck.remaining,
        resetDates: usageCheck.resetDates,
        upgradeRequired: req.user.plan === 'free'
      });
    }

    const options = req.body.options || {};
    
    // 利用回数を記録
    await UsageTrackingService.recordUsage(req.user.id, 'promptRegeneration', {
      mediaFileId: req.params.id,
      options,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    const result = await audioAnalysisService.regeneratePrompts(req.params.id, options);
    
    // 利用状況も一緒に返す
    result.usage = {
      remaining: usageCheck.remaining,
      limits: usageCheck.limits
    };
    
    res.json(result);
  })
);

// @route   PUT /api/media/file/:id/scene-prompts
// @desc    Update scene prompts manually
// @access  Private
router.put('/file/:id/scene-prompts',
  [
    param('id').isUUID().withMessage('Invalid media file ID'),
    body('scenes').isArray().withMessage('Scenes must be an array'),
    body('scenes.*.startTime').isNumeric().withMessage('Start time must be numeric'),
    body('scenes.*.endTime').isNumeric().withMessage('End time must be numeric'),
    body('scenes.*.visualPrompt').isString().withMessage('Visual prompt must be a string')
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

    const { scenes } = req.body;
    const result = await audioAnalysisService.updateScenePrompts(req.params.id, scenes);
    res.json(result);
  })
);

// @route   GET /api/media/usage-stats
// @desc    Get user's audio analysis usage statistics
// @access  Private
router.get('/usage-stats',
  asyncHandler(async (req, res) => {
    const stats = await UsageTrackingService.getUserUsageStats(
      req.user.id,
      req.user.plan || 'free'
    );

    if (!stats) {
      throw new AppError('Failed to retrieve usage statistics', 500);
    }

    res.json({
      success: true,
      data: {
        ...stats,
        planInfo: {
          current: req.user.plan || 'free',
          available: Object.keys(UsageTrackingService.getPlanLimits())
        }
      }
    });
  })
);

// @route   GET /api/media/storage
// @desc    Get user's storage usage
// @access  Private
router.get('/storage',
  asyncHandler(async (req, res) => {
    const agg = await prisma.mediaFile.aggregate({
      where: { ownerId: req.user.id },
      _sum: { size: true },
      _count: { _all: true }
    });

    const used = Number(agg._sum?.size || 0n);
    const fileCount = agg._count?._all || 0;

    const limits = {
      'free': 1024 * 1024 * 1024, // 1GB
      'basic': 10 * 1024 * 1024 * 1024, // 10GB
      'pro': 50 * 1024 * 1024 * 1024, // 50GB
      'premium': 500 * 1024 * 1024 * 1024 // 500GB
    };

    const limit = limits[req.user.plan || 'free'] || limits.free;

    const storageInfo = {
      used,
      fileCount,
      limit,
      percentage: used ? Math.round((used / limit) * 100) : 0
    };

    res.json({
      success: true,
      data: { storage: storageInfo }
    });
  })
);

module.exports = router;