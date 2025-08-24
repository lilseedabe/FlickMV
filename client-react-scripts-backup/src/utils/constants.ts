// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

// File Upload Limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES_PER_UPLOAD = 10;

// Supported File Types
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4'];

export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES
];

// Timeline Configuration
export const TIMELINE_SCALE_MIN = 0.1;
export const TIMELINE_SCALE_MAX = 10;
export const TIMELINE_TRACK_HEIGHT = 60;
export const TIMELINE_AUDIO_TRACK_HEIGHT = 40;

// Export Settings
export const EXPORT_PRESETS = {
  quality: {
    low: { videoBitrate: 1000, audioBitrate: 128, crf: 28 },
    medium: { videoBitrate: 3000, audioBitrate: 192, crf: 23 },
    high: { videoBitrate: 5000, audioBitrate: 256, crf: 20 },
    ultra: { videoBitrate: 8000, audioBitrate: 320, crf: 18 }
  },
  frameRates: [24, 30, 60],
  formats: ['mp4', 'webm']
};

// Animation Durations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500
};

// Local Storage Keys
export const STORAGE_KEYS = {
  authToken: 'flickmv_auth_token',
  userPreferences: 'flickmv_user_preferences',
  recentProjects: 'flickmv_recent_projects',
  editorState: 'flickmv_editor_state'
};

// Error Messages
export const ERROR_MESSAGES = {
  networkError: 'Network error. Please check your connection.',
  authError: 'Authentication failed. Please log in again.',
  fileTooBig: 'File size exceeds the maximum limit.',
  invalidFileType: 'File type not supported.',
  uploadFailed: 'Upload failed. Please try again.',
  exportFailed: 'Export failed. Please try again.',
  genericError: 'Something went wrong. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  projectCreated: 'Project created successfully!',
  projectSaved: 'Project saved successfully!',
  fileUploaded: 'File uploaded successfully!',
  exportStarted: 'Export started successfully!',
  settingsSaved: 'Settings saved successfully!'
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  play: 'Space',
  save: 'Ctrl+S',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  delete: 'Delete',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  cut: 'Ctrl+X',
  selectAll: 'Ctrl+A',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  fitToScreen: 'Ctrl+0'
};

// Theme Colors
export const THEME_COLORS = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Subscription Limits
export const SUBSCRIPTION_LIMITS = {
  free: {
    projects: 3,
    storage: 1024 * 1024 * 1024, // 1GB
    exportsPerMonth: 5,
    maxDuration: 60, // seconds
    watermark: true
  },
  pro: {
    projects: 50,
    storage: 50 * 1024 * 1024 * 1024, // 50GB
    exportsPerMonth: 100,
    maxDuration: 600, // 10 minutes
    watermark: false
  },
  enterprise: {
    projects: 1000,
    storage: 500 * 1024 * 1024 * 1024, // 500GB
    exportsPerMonth: 1000,
    maxDuration: 3600, // 1 hour
    watermark: false
  }
};