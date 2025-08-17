// Audio Analysis Types
import type { MediaFile } from './index';

export interface AudioTranscription {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface MVScene {
  startTime: number;
  endTime: number;
  lyrics: string;
  visualPrompt: string;
  mood: string;
  colors: string[];
  keywords: string[];
}

export interface MVPrompts {
  overallTheme: string;
  scenes: MVScene[];
  suggestions: MVSuggestion[];
}

export interface MVSuggestion {
  type: 'カメラワーク' | 'エフェクト' | 'トランジション' | '全体構成';
  description: string;
}

export interface AudioAnalysisOptions {
  genre?: string;
  mood?: string;
  style?: string;
}

export interface AudioAnalysisResult {
  transcription: AudioTranscription;
  mvPrompts: MVPrompts;
  generatedAt: string;
  options: AudioAnalysisOptions;
}

export interface AudioAnalysisStatus {
  status: 'not_started' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  updatedAt?: string;
  completedAt?: string;
}

// Extended MediaFile type for audio analysis
export interface MediaFileWithAnalysis extends MediaFile {
  analysis?: AudioAnalysisResult;
  processing?: AudioAnalysisStatus;
}

// API Response Types
export interface AudioAnalysisResponse {
  success: boolean;
  data?: {
    mediaFileId: string;
    estimatedTime: string;
    status: string;
  };
  message?: string;
  error?: string;
}

export interface AudioAnalysisResultResponse {
  success: boolean;
  data?: {
    mediaFile: MediaFileWithAnalysis;
    hasAnalysis: boolean;
    analysisStatus: string;
  };
  message?: string;
  error?: string;
}