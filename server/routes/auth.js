const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const prisma = require('../prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, actionRateLimit } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register',
  registerValidation,
  actionRateLimit('register', 5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  asyncHandler(async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // Create user (set basic defaults equivalent to previous model)
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        subscription: 'free',
        preferences: {
          theme: 'dark',
          defaultResolution: '9:16',
          autoSave: true
        },
        usageProjectsCount: 0,
        usageStorageUsed: BigInt(0),
        usageExportsThisMonth: 0,
        emailVerified: false,
        emailVerificationToken
      },
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
        emailVerified: true,
        lastLogin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Generate token
    const token = generateToken(created.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: created,
        token
      }
    });
  })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
  loginValidation,
  actionRateLimit('login', 5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  asyncHandler(async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        avatar: true,
        subscription: true,
        preferences: true,
        usageProjectsCount: true,
        usageStorageUsed: true,
        usageExportsThisMonth: true,
        emailVerified: true,
        lastLogin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user || !user.password) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 401);
    }

    // Update last login (fire-and-forget)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { password: _pw, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  })
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
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
      emailVerified: true,
      lastLogin: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    data: {
      user
    }
  });
}));

// @route   PUT /api/auth/me
// @desc    Update current user
// @access  Private
router.put('/me',
  authMiddleware,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email')
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

    const { name, email, preferences } = req.body;

    // Check if email is already taken
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        throw new AppError('Email is already taken', 400);
      }
    }

    // Merge preferences (shallow)
    let newPrefs = undefined;
    if (preferences) {
      const current = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { preferences: true }
      });
      newPrefs = { ...(current?.preferences || {}), ...preferences };
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email, emailVerified: false } : {}),
        ...(newPrefs ? { preferences: newPrefs } : {})
      },
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
        emailVerified: true,
        lastLogin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updated }
    });
  })
);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  actionRateLimit('change-password', 3, 60 * 60 * 1000), // 3 attempts per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });

    if (!user || !user.password) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Update password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed }
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email')
  ],
  actionRateLimit('forgot-password', 3, 60 * 60 * 1000), // 3 attempts per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Do not reveal user existence
      return res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires
      }
    });

    // TODO: Send email with reset link
    // const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

    res.json({
      success: true,
      message: 'Password reset email sent',
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  })
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
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

    const { password } = req.body;
    const { token } = req.params;

    // Hash token and find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() }
      },
      select: { id: true }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Update password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    // Generate new token
    const jwtToken = generateToken(user.id);

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        token: jwtToken
      }
    });
  })
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // Client removes token; optionally add token blacklist if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account',
  authMiddleware,
  [
    body('password')
      .notEmpty()
      .withMessage('Password confirmation is required'),
    body('confirmation')
      .equals('DELETE')
      .withMessage('Type DELETE to confirm account deletion')
  ],
  actionRateLimit('delete-account', 1, 60 * 60 * 1000), // 1 attempt per hour
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { password } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });

    if (!user || !user.password) {
      throw new AppError('Password is incorrect', 400);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Password is incorrect', 400);
    }

    // Clean up is handled via CASCADE in Prisma schema for related entities
    await prisma.user.delete({
      where: { id: req.user.id }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  })
);

module.exports = router;