const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.githubId;
    },
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  subscription: {
    type: String,
    enum: ['free', 'light', 'standard', 'pro'],
    default: 'free'
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    defaultResolution: {
      type: String,
      enum: ['9:16', '1:1', '16:9'],
      default: '9:16'
    },
    autoSave: {
      type: Boolean,
      default: true
    }
  },
  usage: {
    projectsCount: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // in bytes
    },
    exportsThisMonth: {
      type: Number,
      default: 0
    },
    lastExportDate: Date
  },
  oauth: {
    googleId: String,
    githubId: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ 'oauth.googleId': 1 });
userSchema.index({ 'oauth.githubId': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

// Virtual for full name
userSchema.virtual('initials').get(function() {
  return this.name
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

// Check if user can create new project
userSchema.methods.canCreateProject = function() {
  switch (this.subscription) {
    case 'free':
      return this.usage.projectsCount < 5;
    case 'light':
      return this.usage.projectsCount < 15;
    case 'standard':
      return this.usage.projectsCount < 50;
    case 'pro':
      return this.usage.projectsCount < 100;
    default:
      return false;
  }
};

// Check if user can export this month
userSchema.methods.canExport = function() {
  switch (this.subscription) {
    case 'free':
      return this.usage.exportsThisMonth < 3;
    case 'light':
      return this.usage.exportsThisMonth < 10;
    case 'standard':
      return this.usage.exportsThisMonth < 25;
    case 'pro':
      return this.usage.exportsThisMonth < 40;
    default:
      return false;
  }
};

module.exports = mongoose.model('User', userSchema);