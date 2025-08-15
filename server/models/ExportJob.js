const mongoose = require('mongoose');

const exportSettingsSchema = new mongoose.Schema({
  resolution: {
    type: String,
    enum: ['9:16', '1:1', '16:9', 'custom'],
    required: true
  },
  customResolution: {
    width: {
      type: Number,
      min: 240,
      max: 7680
    },
    height: {
      type: Number,
      min: 240,
      max: 4320
    }
  },
  frameRate: {
    type: Number,
    enum: [24, 30, 60],
    required: true
  },
  format: {
    container: {
      type: String,
      enum: ['mp4', 'webm'],
      default: 'mp4'
    },
    videoCodec: {
      type: String,
      enum: ['h264', 'vp9', 'h265'],
      default: 'h264'
    },
    audioCodec: {
      type: String,
      enum: ['aac', 'mp3', 'opus'],
      default: 'aac'
    }
  },
  quality: {
    preset: {
      type: String,
      enum: ['low', 'medium', 'high', 'ultra'],
      default: 'high'
    },
    videoBitrate: {
      type: Number,
      min: 500,
      max: 50000, // 50 Mbps
      default: 5000
    },
    audioBitrate: {
      type: Number,
      enum: [128, 192, 256, 320],
      default: 192
    },
    crf: {
      type: Number,
      min: 18,
      max: 28,
      default: 23
    }
  },
  includeAudio: {
    type: Boolean,
    default: true
  },
  watermark: {
    enabled: {
      type: Boolean,
      default: false
    },
    text: String,
    position: {
      type: String,
      enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
      default: 'bottom-right'
    },
    opacity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7
    }
  }
});

const exportJobSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  settings: {
    type: exportSettingsSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  priority: {
    type: Number,
    default: 0,
    min: -10,
    max: 10
  },
  processing: {
    startedAt: Date,
    completedAt: Date,
    processingTime: Number, // in seconds
    currentStep: String,
    totalSteps: {
      type: Number,
      default: 5
    },
    currentStepProgress: {
      type: Number,
      default: 0
    },
    ffmpegCommand: String,
    error: {
      message: String,
      stack: String,
      code: String
    },
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    }
  },
  output: {
    url: String,
    filename: String,
    size: Number, // in bytes
    duration: Number, // in seconds
    thumbnail: String,
    storage: {
      provider: {
        type: String,
        enum: ['local', 's3', 'gcs'],
        default: 'local'
      },
      bucket: String,
      key: String,
      region: String
    }
  },
  analytics: {
    downloadCount: {
      type: Number,
      default: 0
    },
    lastDownloaded: Date,
    shareCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    timeline: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    mediaFiles: [{
      id: String,
      name: String,
      url: String,
      type: String
    }],
    projectSettings: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes
exportJobSchema.index({ user: 1, createdAt: -1 });
exportJobSchema.index({ project: 1 });
exportJobSchema.index({ status: 1, priority: -1 });
exportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted processing time
exportJobSchema.virtual('formattedProcessingTime').get(function() {
  if (!this.processing.processingTime) return null;
  
  const seconds = this.processing.processingTime;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
});

// Virtual for formatted output size
exportJobSchema.virtual('formattedOutputSize').get(function() {
  if (!this.output.size) return null;
  
  const bytes = this.output.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for estimated completion time
exportJobSchema.virtual('estimatedCompletion').get(function() {
  if (this.status !== 'processing' || this.progress === 0) return null;
  
  const elapsedTime = Date.now() - this.processing.startedAt.getTime();
  const estimatedTotal = (elapsedTime / this.progress) * 100;
  const remaining = estimatedTotal - elapsedTime;
  
  return new Date(Date.now() + remaining);
});

// Method to update progress
exportJobSchema.methods.updateProgress = function(progress, currentStep = null) {
  this.progress = Math.max(0, Math.min(100, progress));
  
  if (currentStep) {
    this.processing.currentStep = currentStep;
  }
  
  if (progress >= 100) {
    this.status = 'completed';
    this.processing.completedAt = new Date();
    
    if (this.processing.startedAt) {
      this.processing.processingTime = 
        (this.processing.completedAt - this.processing.startedAt) / 1000;
    }
  }
  
  return this.save();
};

// Method to mark as failed
exportJobSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.processing.error = {
    message: error.message,
    stack: error.stack,
    code: error.code
  };
  this.processing.completedAt = new Date();
  
  return this.save();
};

// Method to retry job
exportJobSchema.methods.retry = function() {
  if (this.processing.retryCount >= this.processing.maxRetries) {
    throw new Error('Maximum retry attempts exceeded');
  }
  
  this.processing.retryCount += 1;
  this.status = 'queued';
  this.progress = 0;
  this.processing.error = undefined;
  this.processing.startedAt = undefined;
  this.processing.completedAt = undefined;
  
  return this.save();
};

// Method to start processing
exportJobSchema.methods.startProcessing = function() {
  this.status = 'processing';
  this.processing.startedAt = new Date();
  this.progress = 0;
  
  return this.save();
};

// Method to cancel job
exportJobSchema.methods.cancel = function() {
  if (['completed', 'failed'].includes(this.status)) {
    throw new Error('Cannot cancel completed or failed job');
  }
  
  this.status = 'cancelled';
  this.processing.completedAt = new Date();
  
  return this.save();
};

// Method to increment download count
exportJobSchema.methods.incrementDownload = function() {
  this.analytics.downloadCount += 1;
  this.analytics.lastDownloaded = new Date();
  return this.save();
};

// Static method to get next job in queue
exportJobSchema.statics.getNextJob = function() {
  return this.findOne({ status: 'queued' })
             .sort({ priority: -1, createdAt: 1 });
};

// Static method to cleanup expired jobs
exportJobSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: { $in: ['completed', 'failed', 'cancelled'] }
  });
};

// Pre-save middleware
exportJobSchema.pre('save', function(next) {
  // Generate filename if not provided
  if (this.status === 'completed' && this.output.url && !this.output.filename) {
    const extension = this.settings.format.container;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.output.filename = `${this.name}-${timestamp}.${extension}`;
  }
  
  next();
});

module.exports = mongoose.model('ExportJob', exportJobSchema);