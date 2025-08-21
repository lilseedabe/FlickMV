// ===== USER & AUTH TYPES =====
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'light' | 'standard' | 'pro';
  subscription: {
    status: 'active' | 'cancelled' | 'expired' | 'past_due';
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    exportsRemaining: number;
    exportsLimit: number;
    subscriptionId?: string;
  };
  usage: {
    exportsThisMonth: number;
    totalExports: number;
    storageUsed: number; // GB
    storageLimit: number; // GB
    lastExportDate?: Date;
  };
  preferences: {
    theme: 'dark' | 'light';
    language: 'ja' | 'en';
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
  };
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'upgrade' | 'success';
  title: string;
  message: string;
  unread: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionText?: string;
}

// ===== MEDIA TYPES =====
export type MediaType = 'image' | 'video' | 'audio';

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  size: number; // bytes
  width?: number;
  height?: number;
  duration?: number; // seconds for video/audio
  format: string;
  uploadedAt: Date;
  metadata?: {
    bitrate?: number;
    channels?: number;
    frameRate?: number;
    [key: string]: any;
  };
}

// ===== PROJECT & TIMELINE TYPES =====
export type EffectType = 'pan_zoom' | 'fade_in' | 'fade_out' | 'blur' | 'color_grade' | 'custom' | 'brightness' | 'contrast' | 'saturation' | 'speed' | 'fade';

export interface Effect {
  id: string;
  type: EffectType;
  parameters: {
    [key: string]: any;
  };
  enabled: boolean;
}

export type ClipEffect = Effect; // Alias for compatibility

export interface Transition {
  type: 'cut' | 'crossfade' | 'slide' | 'wipe' | 'custom';
  duration: number; // seconds
  parameters?: {
    [key: string]: any;
  };
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  startTime: number; // seconds
  duration: number; // seconds
  trimStart: number; // seconds
  trimEnd: number; // seconds
  layer: number;
  effects?: Effect[];
  transitions?: {
    in?: Transition;
    out?: Transition;
  };
}

export interface AudioTrack {
  id: string;
  // メディア管理ID（未連携の場合もあるため任意）
  mediaId?: string;
  // 表示/識別用
  name?: string;
  url?: string;
  // タイムライン配置
  startTime: number;
  duration: number;
  volume: number; // 0-1
  muted?: boolean;
  // 解析情報
  bpm?: number;
  beats?: number[]; // beat timestamps
  bars?: number[]; // bar start timestamps
  analyzedAt?: string;
}

export interface Timeline {
  clips: TimelineClip[];
  audioTracks: AudioTrack[];
  duration: number; // seconds
  zoom: number;
  playheadPosition: number;
}

export interface OutputFormat {
  container: 'mp4' | 'mov' | 'avi' | 'webm';
  videoCodec: 'h264' | 'h265' | 'vp9' | 'av1';
  audioBitrate: number; // kbps
  videoBitrate: number; // kbps
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export type Resolution = '720p' | '1080p' | '4K' | '9:16' | '16:9' | '1:1' | '4:3' | 'custom';

export interface ProjectSettings {
  resolution: Resolution;
  frameRate: 24 | 30 | 60;
  duration: number; // seconds
  outputFormat: OutputFormat;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  settings: ProjectSettings;
  timeline: Timeline;
  mediaLibrary: MediaFile[];
  createdAt: Date;
  updatedAt: Date;
  status?: 'draft' | 'in-progress' | 'completed';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// ===== WATERMARK TYPES =====
export interface WatermarkSettings {
  enabled: boolean;
  preset: 'minimal' | 'branded' | 'corner' | 'center';
}

export interface WatermarkPreset {
  id: string;
  name: string;
  position: { x: number; y: number }; // percentage
  size: number; // pixels
  opacity: number; // percentage
  style: 'minimal' | 'branded' | 'corner' | 'center';
}

// ===== EXPORT & JOB TYPES =====
export interface ExportJob {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  settings?: {
    resolution?: Resolution | string;
    frameRate?: 24 | 30 | 60;
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    format?: 'mp4' | 'webm' | string;
    includeAudio?: boolean;
    name?: string;
  };
  processing?: {
    bossJobId?: string;
    currentStep?: string;
    startedAt?: string;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  };
  output?: {
    url?: string;
    filename?: string;
    size?: number;
    duration?: number;
    storage?: {
      provider: 'local' | 's3';
      bucket?: string;
      key?: string;
    };
    watermark?: {
      applied: boolean;
      preset: string;
      timestamp: string;
    };
  };
  watermarkSettings?: WatermarkSettings;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
}

// ===== TEMPLATE TYPES =====
export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  tags: string[];
  uses: number;
  rating?: number;
  premium: boolean;
  projectData: Partial<Project>;
}

// ===== TUTORIAL TYPES =====
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
  steps: TutorialStep[];
  completed?: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector or element ID
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'input' | 'wait';
}

// ===== PLAN & SUBSCRIPTION TYPES =====
export interface PlanFeatures {
  name: string;
  price: string;
  period: string;
  description: string;
  watermark: string;
  features: string[];
  limits: {
    exportsPerMonth: number; // -1 for unlimited
    maxResolution: string;
    storageGB: number; // -1 for unlimited
    watermarkRemoval: boolean;
  };
  color: string;
  popular: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  date: Date;
  planName: string;
  downloadUrl?: string;
}

// ===== API RESPONSE TYPES =====
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== COMPONENT PROP TYPES =====
export interface MediaLibraryProps {
  mediaFiles: MediaFile[];
  onUpload: (files: FileList) => void;
  onSelect?: (mediaFile: MediaFile) => void;
  onDelete?: (mediaId: string) => void;
}

export interface TimelineProps {
  timeline: Timeline;
  playheadPosition: number;
  zoom: number;
  onClipSelect: (clip: TimelineClip) => void;
  onTimelineUpdate: (timeline: Timeline) => void;
  onPlayheadChange?: (position: number) => void;
}

export interface PreviewProps {
  project: Project;
  playheadPosition: number;
  isPlaying: boolean;
  watermarkSettings?: WatermarkSettings;
}

export interface PropertiesPanelProps {
  selectedClip: TimelineClip | null;
  projectSettings: ProjectSettings;
  onClipUpdate: (clip: TimelineClip) => void;
  onSettingsUpdate: (settings: ProjectSettings) => void;
}

export interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
  onSeek?: (time: number) => void;
}

export interface WatermarkPanelProps {
  user: User;
  onUpgrade: (plan: string) => void;
  onWatermarkChange: (enabled: boolean, preset: WatermarkPreset) => void;
}

export interface WatermarkOverlayProps {
  enabled: boolean;
  preset: WatermarkPreset;
  className?: string;
}

// ===== CONTEXT TYPES =====
export interface UserContextType {
  user: User | null;
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  upgradePlan: (plan: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  
  // Computed properties
  canRemoveWatermark: boolean;
  hasUnreadNotifications: boolean;
  isUpgradeNeeded: boolean;
}

// ===== UTILITY TYPES =====
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ===== FORM TYPES =====
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ProjectForm {
  name: string;
  description?: string;
  template?: string;
}

export interface ExportForm {
  resolution: string;
  format: string;
  quality: string;
  watermarkSettings: WatermarkSettings;
}

// ===== ERROR TYPES =====
export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ===== ANALYTICS TYPES =====
export interface Analytics {
  totalProjects: number;
  totalExports: number;
  storageUsed: number;
  popularTemplates: Array<{
    id: string;
    name: string;
    uses: number;
  }>;
  exportsByPlan: Record<string, number>;
  userGrowth: Array<{
    date: string;
    count: number;
  }>;
}

// ===== EXPORT CONSTANTS =====
// ===== BPM & AUDIO ANALYSIS TYPES =====
export interface BPMAnalysis {
  bpm: number;
  confidence: number;
  beatTimes: number[]; // 各ビートのタイムスタンプ（秒）
  bars: number[]; // 小節の開始タイムスタンプ
  timeSignature: {
    numerator: number; // 4/4 の 4
    denominator: number; // 4/4 の 4
  };
}

export interface FrequencyBand {
  name: string;
  range: [number, number]; // Hz範囲
  energy: number; // 0-1
  threshold: number; // トリガー閾値
  triggered: boolean;
}

export interface AudioAnalysis {
  frequencyBands: FrequencyBand[];
  rms: number; // 音量レベル
  peak: number; // ピーク音量
  spectralCentroid: number; // 音の明るさ
  zcr: number; // Zero Crossing Rate
}

// ===== BEAT SNAP & GRID TYPES =====
export interface BeatGrid {
  enabled: boolean;
  snapToBeat: boolean;
  snapToBar: boolean;
  subdivisions: 1 | 2 | 4 | 8 | 16; // 1/16拍まで対応
  quantizeStrength: number; // 0-1
}

export interface EditRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'cutting' | 'effects' | 'animation' | 'color';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  trigger: 'beat' | 'bar' | 'phrase' | 'frequency' | 'manual';
  parameters: {
    [key: string]: any;
  };
  previewGif?: string;
}

// ===== PRESET LIBRARY TYPES =====
export interface MusicPreset {
  id: string;
  name: string;
  description: string;
  genre: string;
  bpmRange: [number, number];
  thumbnail: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  effects: Effect[];
  transitions: Transition[];
  colorGrading?: {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
  };
  animationStyle: 'smooth' | 'energetic' | 'minimal' | 'dramatic';
  beatSync: boolean;
  uses: number;
  rating: number;
  premium: boolean;
  createdAt: Date;
  author?: string;
}

export interface PresetCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  presets: MusicPreset[];
}

// ===== FREQUENCY TRIGGER TYPES =====
export interface FrequencyTrigger {
  id: string;
  name: string;
  band: 'bass' | 'mids' | 'highs' | 'custom';
  customRange?: [number, number]; // Hz範囲（カスタムの場合）
  threshold: number; // 0-1
  effect: Effect;
  enabled: boolean;
  sensitivity: number; // 0-1
  duration: number; // エフェクト持続時間（秒）
  cooldown: number; // 再トリガーまでの待機時間（秒）
}

export interface FrequencyEffect {
  id: string;
  type: 'flash' | 'zoom' | 'color_shift' | 'blur' | 'particle' | 'shake';
  intensity: number; // 0-1
  duration: number; // 秒
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

// ===== SNS PRESET TYPES =====
export interface SNSPreset {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube_shorts' | 'twitter' | 'facebook';
  name: string;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  resolution: {
    width: number;
    height: number;
  };
  maxDuration: number; // 秒
  maxFileSize: number; // MB
  recommendedBitrate: number; // kbps
  audioCodec: string;
  videoCodec: string;
  frameRate: number[];
  safeArea: {
    top: number; // パーセント
    bottom: number;
    left: number;
    right: number;
  };
  requirements: {
    minDuration?: number;
    maxDuration?: number;
    audioRequired?: boolean;
    captionsRecommended?: boolean;
  };
  optimization: {
    cropStrategy: 'center' | 'smart' | 'manual';
    scaleStrategy: 'fit' | 'fill' | 'stretch';
    compressionLevel: 'low' | 'medium' | 'high';
    motionBlur: boolean;
    deinterlace: boolean;
  };
}

// ===== ENHANCED AUDIO TRACK =====
export interface AudioTrackEnhanced extends AudioTrack {
  bpmAnalysis?: BPMAnalysis;
  audioAnalysis?: AudioAnalysis;
  frequencyTriggers?: FrequencyTrigger[];
  beatGrid?: BeatGrid;
  waveformData?: Float32Array; // 波形表示用データ
  spectrogramData?: number[][]; // スペクトログラム表示用データ
}

// ===== ENHANCED TIMELINE =====
export interface TimelineEnhanced extends Timeline {
  audioTracks: AudioTrackEnhanced[];
  beatGrid: BeatGrid;
  editRecipes: EditRecipe[];
  snapSettings: {
    snapToBeat: boolean;
    snapToBar: boolean;
    snapToGrid: boolean;
    magneticSnap: boolean;
    snapDistance: number; // ピクセル
  };
}

// ===== ENHANCED PROJECT =====
export interface ProjectEnhanced extends Project {
  timeline: TimelineEnhanced;
  presets: {
    applied: MusicPreset[];
    favorites: string[]; // preset IDs
  };
  snsOptimization: {
    targetPlatform?: string;
    autoOptimize: boolean;
    customSettings?: SNSPreset;
  };
  frequencyAnalysis: {
    enabled: boolean;
    realTimeMode: boolean;
    triggers: FrequencyTrigger[];
    history: AudioAnalysis[]; // 分析履歴
  };
}

// ===== COMPONENT PROPS EXTENSIONS =====
export interface BPMDetectorProps {
  audioFile: MediaFile;
  onBPMDetected: (analysis: BPMAnalysis) => void;
  onAnalysisStart?: () => void;
  onAnalysisComplete?: () => void;
  onError?: (error: string) => void;
}

export interface BeatTimelineProps extends TimelineProps {
  bpmAnalysis?: BPMAnalysis;
  beatGrid: BeatGrid;
  onBeatGridChange: (grid: BeatGrid) => void;
  showBeatMarkers?: boolean;
  showBarMarkers?: boolean;
}

export interface PresetLibraryProps {
  presets: MusicPreset[];
  categories: PresetCategory[];
  selectedGenre?: string;
  selectedBPMRange?: [number, number];
  onPresetSelect: (preset: MusicPreset) => void;
  onPresetFavorite: (presetId: string) => void;
  onGenreFilter: (genre: string) => void;
  onBPMFilter: (range: [number, number]) => void;
}

export interface FrequencyAnalyzerProps {
  audioContext: AudioContext;
  audioBuffer: AudioBuffer;
  onAnalysisUpdate: (analysis: AudioAnalysis) => void;
  triggers: FrequencyTrigger[];
  onTriggerFired: (triggerId: string, intensity: number) => void;
  realTime?: boolean;
}

export interface SNSOptimizerProps {
  project: ProjectEnhanced;
  targetPlatforms: string[];
  onOptimizationApply: (settings: SNSPreset) => void;
  onPreviewGenerate: (platform: string) => void;
}

export interface EditRecipesPanelProps {
  recipes: EditRecipe[];
  selectedClip: TimelineClip | null;
  bpmAnalysis?: BPMAnalysis;
  onRecipeApply: (recipe: EditRecipe, clip: TimelineClip) => void;
  onRecipePreview: (recipe: EditRecipe) => void;
}

// ===== EXPORT CONSTANTS =====
export const PLAN_TYPES = ['free', 'light', 'standard', 'pro'] as const;
export const MEDIA_TYPES = ['image', 'video', 'audio'] as const;
export const EXPORT_STATUSES = ['queued', 'processing', 'completed', 'failed', 'cancelled'] as const;
export const WATERMARK_PRESETS = ['minimal', 'branded', 'corner', 'center'] as const;
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const FREQUENCY_BANDS = {
  BASS: [20, 250],
  MIDS: [250, 4000],
  HIGHS: [4000, 20000],
  SUB_BASS: [20, 60],
  KICK: [60, 100],
  SNARE: [150, 300],
  VOCALS: [300, 3000],
  PRESENCE: [3000, 8000],
  BRILLIANCE: [8000, 20000]
} as const;

export const SNS_PLATFORMS = {
  INSTAGRAM: {
    FEED: '1:1',
    STORY: '9:16',
    REEL: '9:16'
  },
  TIKTOK: '9:16',
  YOUTUBE_SHORTS: '9:16',
  TWITTER: '16:9',
  FACEBOOK: '16:9'
} as const;

// ===== RESOLUTION PRESETS =====
export const RESOLUTION_PRESETS = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
  'custom': { width: 1920, height: 1080 }
} as const;

export type ResolutionPreset = keyof typeof RESOLUTION_PRESETS;

export interface VideoResolution {
  width: number;
  height: number;
}
