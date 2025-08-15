const mongoose = require('mongoose');

const mediaFileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  originalName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true
  },
  format: {
    type: String,
    required: true,
    lowercase: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    default: null,
    min: 0
  },
  dimensions: {
    width: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: null
    }
  },
  metadata: {
    fps: {
      type: Number,
      default: null
    },
    bitrate: {
      type: Number,
      default: null
    },
    codec: {
      type: String,
      default: null
    },
    channels: {
      type: Number,
      default: null
    },
    sampleRate: {
      type: Number,
      default: null
    },
    colorSpace: {
      type: String,
      default: null
    },
    orientation: {
      type: Number,
      default: 1
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  storage: {
    provider: {
      type: String,
      enum: ['local', 's3', 'gcs'],
      default: 'local'
    },
    bucket: String,
    key: String,
    region: String
  },
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    error: String,
    thumbnailGenerated: {
      type: Boolean,
      default: false
    },
    metadataExtracted: {
      type: Boolean,
      default: false
    }
  },
  analysis: {
    bpm: {
      type: Number,
      default: null
    },
    key: {
      type: String,
      default: null
    },
    tempo: {
      type: String,
      default: null
    },
    beats: [{
      time: Number,
      confidence: Number
    }],
    segments: [{
      start: Number,
      end: Number,
      bpm: Number,
      confidence: Number
    }],
    dominantColors: [String],
    faces: [{
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      confidence: Number
    }],
    objects: [{
      name: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }]
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
mediaFileSchema.index({ owner: 1, createdAt: -1 });
mediaFileSchema.index({ project: 1 });
mediaFileSchema.index({ type: 1 });
mediaFileSchema.index({ name: 'text', tags: 'text' });
mediaFileSchema.index({ 'processing.status': 1 });

// Virtual for formatted file size
mediaFileSchema.virtual('formattedSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for formatted duration
mediaFileSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return null;
  
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to check if file is processed
mediaFileSchema.methods.isProcessed = function() {
  return this.processing.status === 'completed';
};

// Method to check if user can access file
mediaFileSchema.methods.canAccess = function(userId) {
  // Owner can always access
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Public files can be accessed by anyone
  if (this.isPublic) {
    return true;
  }
  
  // Check project permissions (will need to populate project)
  return false;
};

// Method to increment download count
mediaFileSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Pre-save middleware
mediaFileSchema.pre('save', function(next) {
  // Auto-generate thumbnail URL for images
  if (this.type === 'image' && !this.thumbnail) {
    this.thumbnail = this.url;
  }
  
  next();
});

// Static method to get storage usage by user
mediaFileSchema.statics.getStorageUsage = function(userId) {
  return this.aggregate([
    { $match: { owner: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalSize: { $sum: '$size' }, count: { $sum: 1 } } }
  ]);
};

// Static method to get files by type
mediaFileSchema.statics.getByType = function(projectId, type) {
  return this.find({ project: projectId, type: type })
             .sort({ createdAt: -1 });
};

module.exports = mongoose.model('MediaFile', mediaFileSchema);