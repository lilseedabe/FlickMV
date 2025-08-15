/**
 * Unified error handling middleware
 * - Always responds with { success: false, message, code? } (message is primary)
 * - In development, includes stack and raw details for debugging
 * - Keeps backwards compatibility by including "error" field mirroring "message"
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      code: 'NOT_FOUND'
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    const message = `${field} already exists`;
    error = {
      message,
      statusCode: 400,
      code: 'DUPLICATE_KEY'
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map(val => val.message)
      .join(', ') || 'Validation error';
    error = {
      message,
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401,
      code: 'INVALID_TOKEN'
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401,
      code: 'TOKEN_EXPIRED'
    };
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    error = {
      message,
      statusCode: 400,
      code: 'FILE_TOO_LARGE'
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded';
    error = {
      message,
      statusCode: 400,
      code: 'TOO_MANY_FILES'
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected field in file upload';
    error = {
      message,
      statusCode: 400,
      code: 'UNEXPECTED_FILE'
    };
  }

  // FFmpeg errors
  if (err.message && err.message.toString().toLowerCase().includes('ffmpeg')) {
    const message = 'Video processing error';
    error = {
      message,
      statusCode: 500,
      code: 'FFMPEG_ERROR'
    };
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection error';
    error = {
      message,
      statusCode: 503,
      code: 'DB_CONNECTION_ERROR'
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Build response
  const payload = {
    success: false,
    message,
    error: message, // backward compatibility for clients reading "error"
    ...(error.code ? { code: error.code } : {}),
    ...(error.retryAfter ? { retryAfter: error.retryAfter } : {})
  };

  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
    payload.details = err;
  }

  res.status(statusCode).json(payload);
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    if (code) this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error creator
const createValidationError = (field, message) => {
  const error = new AppError(`Validation Error: ${field} - ${message}`, 400, 'VALIDATION_ERROR');
  return error;
};

// Permission error creator
const createPermissionError = (action = 'perform this action') => {
  const error = new AppError(`Permission denied: You don't have permission to ${action}`, 403, 'FORBIDDEN');
  return error;
};

// Not found error creator
const createNotFoundError = (resource = 'Resource') => {
  const error = new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  return error;
};

// Rate limit error creator
const createRateLimitError = (retryAfter = null) => {
  const message = retryAfter
    ? `Too many requests. Please try again in ${retryAfter} seconds.`
    : 'Too many requests. Please try again later.';
  const error = new AppError(message, 429, 'RATE_LIMITED');
  if (retryAfter) {
    error.retryAfter = retryAfter;
  }
  return error;
};

// Subscription error creator
const createSubscriptionError = (requiredTier, currentTier) => {
  const error = new AppError(
    `${requiredTier} subscription required. Current subscription: ${currentTier}`,
    402,
    'PAYMENT_REQUIRED'
  );
  error.upgradeRequired = true;
  error.requiredSubscription = requiredTier;
  error.currentSubscription = currentTier;
  return error;
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  createValidationError,
  createPermissionError,
  createNotFoundError,
  createRateLimitError,
  createSubscriptionError
};