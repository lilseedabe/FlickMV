const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

// Auth middleware (required)
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Load user from Postgres via Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      // Exclude password from req.user; keep minimal fields commonly used downstream
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        subscription: true,
        preferences: true,
        usageProjectsCount: true,
        usageStorageUsed: true,
        usageExportsThisMonth: true,
        lastExportDate: true,
        emailVerified: true,
        lastLogin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Optional auth middleware - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        subscription: true,
        preferences: true,
        usageProjectsCount: true,
        usageStorageUsed: true,
        usageExportsThisMonth: true,
        lastExportDate: true,
        emailVerified: true,
        lastLogin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch {
    // Continue without authentication
    next();
  }
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Subscription middleware
const requireSubscription = (requiredTier) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const subscriptionLevels = {
      free: 0,
      pro: 1,
      enterprise: 2
    };

    const userLevel = subscriptionLevels[req.user.subscription] || 0;
    const requiredLevel = subscriptionLevels[requiredTier] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `${requiredTier} subscription required`,
        upgradeRequired: true,
        currentSubscription: req.user.subscription,
        requiredSubscription: requiredTier
      });
    }

    next();
  };
};

// Project permission middleware (Prisma)
const projectPermission = (permission = 'view') => {
  return async (req, res, next) => {
    try {
      const prisma = require('../prisma/client');
      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID required'
        });
      }

      // Fetch minimal project with owner and collaborators
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          ownerId: true,
          isPublic: true,
          collaborators: {
            select: { userId: true, role: true }
          }
        }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      let hasPermission = false;

      switch (permission) {
        case 'view':
          if (project.isPublic) {
            hasPermission = true;
          } else if (project.ownerId === userId) {
            hasPermission = true;
          } else {
            hasPermission = project.collaborators.some(c => c.userId === userId);
          }
          break;

        case 'edit':
          if (project.ownerId === userId) {
            hasPermission = true;
          } else {
            const collab = project.collaborators.find(c => c.userId === userId);
            hasPermission = !!collab && (collab.role === 'editor' || collab.role === 'admin');
          }
          break;

        case 'admin':
          hasPermission = project.ownerId === userId;
          break;

        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions to ${permission} this project`
        });
      }

      // attach project stub (frequently used downstream)
      req.project = project;
      next();
    } catch (error) {
      console.error('Project permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error checking project permissions'
      });
    }
  };
};

// In-memory rate limit (per-process best-effort)
const actionRateLimit = (action, maxRequests, windowMs) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.user?.id || 'anon'}-${action}`;
    const now = Date.now();

    // Cleanup
    for (const [k, v] of attempts.entries()) {
      if (now - v.timestamp > windowMs) {
        attempts.delete(k);
      }
    }

    const userAttempts = attempts.get(key);

    if (!userAttempts) {
      attempts.set(key, { count: 1, timestamp: now });
      return next();
    }

    if (now - userAttempts.timestamp > windowMs) {
      attempts.set(key, { count: 1, timestamp: now });
      return next();
    }

    if (userAttempts.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: `Too many ${action} attempts. Please try again later.`,
        retryAfter: Math.ceil((windowMs - (now - userAttempts.timestamp)) / 1000)
      });
    }

    userAttempts.count++;
    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminMiddleware,
  requireSubscription,
  projectPermission,
  actionRateLimit
};