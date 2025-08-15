const mongoose = require('mongoose');

const effectSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['brightness', 'contrast', 'saturation', 'speed', 'pan_zoom', 'fade'],
    required: true
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const transitionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['crossfade', 'wipe', 'zoom', 'slide'],
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0.1,
    max: 5
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const timelineClipSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  mediaId: {
    type: String,
    required: true
  },
  startTime: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 0.1
  },
  trimStart: {
    type: Number,
    default: 0,
    min: 0
  },
  trimEnd: {
    type: Number,
    required: true,
    min: 0
  },
  layer: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  effects: [effectSchema],
  transitions: {
    in: transitionSchema,
    out: transitionSchema
  }
});

const audioTrackSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  mediaId: {
    type: String,
    required: true
  },
  startTime: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 0.1
  },
  volume: {
    type: Number,
    default: 0.8,
    min: 0,
    max: 1
  },
  fadeIn: {
    type: Number,
    default: 0,
    min: 0
  },
  fadeOut: {
    type: Number,
    default: 0,
    min: 0
  },
  bpm: Number,
  beats: [Number]
});

const timelineSchema = new mongoose.Schema({
  clips: [timelineClipSchema],
  audioTracks: [audioTrackSchema],
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 600 // 10 minutes max
  },
  zoom: {
    type: Number,
    default: 1,
    min: 0.1,
    max: 10
  },
  playheadPosition: {
    type: Number,
    default: 0,
    min: 0
  }
});

const outputFormatSchema = new mongoose.Schema({
  container: {
    type: String,
    enum: ['mp4', 'webm'],
    default: 'mp4'
  },
  videoCodec: {
    type: String,
    enum: ['h264', 'vp9'],
    default: 'h264'
  },
  audioBitrate: {
    type: Number,
    default: 128,
    enum: [128, 192, 256, 320]
  },
  videoBitrate: {
    type: Number,
    default: 5000
  },
  quality: {
    type: String,
    enum: ['low', 'medium', 'high', 'ultra'],
    default: 'high'
  }
});

const projectSettingsSchema = new mongoose.Schema({
  resolution: {
    type: String,
    enum: ['9:16', '1:1', '16:9', 'custom'],
    default: '9:16'
  },
  frameRate: {
    type: Number,
    enum: [24, 30, 60],
    default: 30
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 600
  },
  outputFormat: outputFormatSchema
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    type: projectSettingsSchema,
    required: true
  },
  timeline: {
    type: timelineSchema,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed', 'archived'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  metadata: {
    totalClips: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });
projectSchema.index({ status: 1 });
projectSchema.index({ isPublic: 1 });
projectSchema.index({ tags: 1 });

// Virtual for timeline clips count
projectSchema.virtual('clipsCount').get(function() {
  return this.timeline.clips.length;
});

// Virtual for total duration formatted
projectSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.timeline.duration / 60);
  const seconds = Math.floor(this.timeline.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Pre-save middleware to update metadata
projectSchema.pre('save', function(next) {
  if (this.isModified('timeline')) {
    this.metadata.totalClips = this.timeline.clips.length;
    this.metadata.totalDuration = this.timeline.duration;
  }
  next();
});

// Method to check if user can edit project
projectSchema.methods.canEdit = function(userId) {
  // Owner can always edit
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check collaborators
  const collaborator = this.collaborators.find(
    c => c.user.toString() === userId.toString()
  );
  
  return collaborator && ['editor', 'admin'].includes(collaborator.role);
};

// Method to check if user can view project
projectSchema.methods.canView = function(userId) {
  // Public projects can be viewed by anyone
  if (this.isPublic) {
    return true;
  }
  
  // Owner can always view
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check collaborators
  const collaborator = this.collaborators.find(
    c => c.user.toString() === userId.toString()
  );
  
  return !!collaborator;
};

// Method to add collaborator
projectSchema.methods.addCollaborator = function(userId, role = 'viewer') {
  const existingCollaborator = this.collaborators.find(
    c => c.user.toString() === userId.toString()
  );
  
  if (existingCollaborator) {
    existingCollaborator.role = role;
  } else {
    this.collaborators.push({
      user: userId,
      role: role,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove collaborator
projectSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    c => c.user.toString() !== userId.toString()
  );
  
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema);