import { useState, useCallback, useRef, useEffect } from 'react';
import apiService from '../services/apiService';
import type {
  MediaFileWithAnalysis,
  AudioAnalysisOptions,
  AudioAnalysisResult
} from '../types/audioAnalysis';

interface UseAudioAnalysisOptions {
  pollingInterval?: number;
  maxPollingAttempts?: number;
  onAnalysisComplete?: (result: AudioAnalysisResult) => void;
  onAnalysisError?: (error: Error) => void;
}

interface UseAudioAnalysisReturn {
  // State
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
  result: AudioAnalysisResult | null;

  // Actions
  startAnalysis: (mediaId: string, options?: AudioAnalysisOptions) => Promise<void>;
  regeneratePrompts: (mediaId: string, options?: AudioAnalysisOptions) => Promise<void>;
  updateScenes: (mediaId: string, scenes: any[]) => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Utils
  getAnalysisStatus: (mediaId: string) => Promise<any>;
}

export const useAudioAnalysis = (options: UseAudioAnalysisOptions = {}): UseAudioAnalysisReturn => {
  const {
    pollingInterval = 2000,
    maxPollingAttempts = 150, // 5分間のポーリング
    onAnalysisComplete,
    onAnalysisError
  } = options;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);

  // window.setTimeout は number を返すため number | null として扱う
  const pollingTimeoutRef = useRef<number | null>(null);
  const pollingAttemptsRef = useRef(0);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current !== null) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setProgress(0);
    setError(null);
    setResult(null);
    pollingAttemptsRef.current = 0;

    if (pollingTimeoutRef.current !== null) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const pollAnalysisStatus = useCallback(
    async (mediaId: string) => {
      try {
        const response = await apiService.getAudioAnalysis(mediaId);

        if (!response.success) {
          throw new Error(response.message || '解析状況の取得に失敗しました');
        }

        const { mediaFile, analysisStatus } = response.data;

        // 進捗更新
        if (mediaFile.processing?.progress != null) {
          setProgress(mediaFile.processing.progress);
        }

        // 完了チェック
        if (analysisStatus === 'completed' && mediaFile.analysis) {
          setResult(mediaFile.analysis);
          setIsAnalyzing(false);
          setProgress(100);

          if (onAnalysisComplete) {
            onAnalysisComplete(mediaFile.analysis);
          }
          return true; // 完了
        }

        // 失敗チェック
        if (analysisStatus === 'failed') {
          const errorMessage = mediaFile.processing?.error || '解析に失敗しました';
          setError(errorMessage);
          setIsAnalyzing(false);

          if (onAnalysisError) {
            onAnalysisError(new Error(errorMessage));
          }
          return true; // 終了（失敗）
        }

        // まだ処理中
        return false;
      } catch (err: any) {
        setError(err?.message || '解析状況の確認に失敗しました');
        setIsAnalyzing(false);

        if (onAnalysisError) {
          onAnalysisError(err);
        }
        return true; // エラーのため終了
      }
    },
    [onAnalysisComplete, onAnalysisError]
  );

  const startPolling = useCallback(
    (mediaId: string) => {
      pollingAttemptsRef.current = 0;

      const poll = async () => {
        pollingAttemptsRef.current++;

        if (pollingAttemptsRef.current > maxPollingAttempts) {
          setError('解析がタイムアウトしました。時間をおいて再度お試しください。');
          setIsAnalyzing(false);
          return;
        }

        const isComplete = await pollAnalysisStatus(mediaId);

        if (!isComplete) {
          pollingTimeoutRef.current = window.setTimeout(poll, pollingInterval);
        }
      };

      poll();
    },
    [pollAnalysisStatus, pollingInterval, maxPollingAttempts]
  );

  const startAnalysis = useCallback(
    async (mediaId: string, analysisOptions: AudioAnalysisOptions = {}) => {
      try {
        reset();
        setIsAnalyzing(true);
        setProgress(0);

        const response = await apiService.analyzeAudio(mediaId, analysisOptions);

        if (!response.success) {
          throw new Error(response.message || '解析の開始に失敗しました');
        }

        // ポーリング開始
        startPolling(mediaId);
      } catch (err: any) {
        setError(err?.message || '解析の開始に失敗しました');
        setIsAnalyzing(false);

        if (onAnalysisError) {
          onAnalysisError(err);
        }
      }
    },
    [reset, startPolling, onAnalysisError]
  );

  const regeneratePrompts = useCallback(
    async (mediaId: string, analysisOptions: AudioAnalysisOptions = {}) => {
      try {
        setError(null);

        const response = await apiService.regeneratePrompts(mediaId, analysisOptions);

        if (!response.success) {
          throw new Error(response.message || 'プロンプトの再生成に失敗しました');
        }

        // 結果を更新
        if (result) {
          setResult({
            ...result,
            mvPrompts: response.data.mvPrompts
          });
        }
      } catch (err: any) {
        setError(err?.message || 'プロンプトの再生成に失敗しました');

        if (onAnalysisError) {
          onAnalysisError(err);
        }
      }
    },
    [result, onAnalysisError]
  );

  const updateScenes = useCallback(
    async (mediaId: string, scenes: any[]) => {
      try {
        setError(null);

        const response = await apiService.updateScenePrompts(mediaId, scenes);

        if (!response.success) {
          throw new Error(response.message || 'シーンの更新に失敗しました');
        }

        // ローカル状態を更新
        if (result) {
          setResult({
            ...result,
            mvPrompts: {
              ...result.mvPrompts,
              scenes
            }
          });
        }
      } catch (err: any) {
        setError(err?.message || 'シーンの更新に失敗しました');

        if (onAnalysisError) {
          onAnalysisError(err);
        }
      }
    },
    [result, onAnalysisError]
  );

  const getAnalysisStatus = useCallback(async (mediaId: string) => {
    try {
      const response = await apiService.getAudioAnalysis(mediaId);
      return response.data;
    } catch (err) {
      console.error('Failed to get analysis status:', err);
      return null;
    }
  }, []);

  return {
    // State
    isAnalyzing,
    progress,
    error,
    result,

    // Actions
    startAnalysis,
    regeneratePrompts,
    updateScenes,
    clearError,
    reset,

    // Utils
    getAnalysisStatus
  };
};

// 便利なヘルパーフック：単一の音声ファイル用
export const useAudioFileAnalysis = (mediaFile: MediaFileWithAnalysis | null) => {
  const audioAnalysis = useAudioAnalysis({
    onAnalysisComplete: (result) => {
      console.log('Audio analysis completed:', result);
    },
    onAnalysisError: (error) => {
      console.error('Audio analysis error:', error);
    }
  });

  // 初期データの設定（必要に応じてローカル状態を初期化）
  useEffect(() => {
    if (mediaFile?.analysis) {
      // 既に解析済みであれば UI を初期化（必要に応じて拡張）
      audioAnalysis.clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFile?.id]);

  const analyzeCurrentFile = useCallback(
    (options?: AudioAnalysisOptions) => {
      if (!mediaFile) {
        throw new Error('分析するメディアファイルが選択されていません');
      }
      return audioAnalysis.startAnalysis(mediaFile.id, options);
    },
    [mediaFile, audioAnalysis]
  );

  const regenerateCurrentPrompts = useCallback(
    (options?: AudioAnalysisOptions) => {
      if (!mediaFile) {
        throw new Error('プロンプトを再生成するメディアファイルが選択されていません');
      }
      return audioAnalysis.regeneratePrompts(mediaFile.id, options);
    },
    [mediaFile, audioAnalysis]
  );

  const updateCurrentScenes = useCallback(
    (scenes: any[]) => {
      if (!mediaFile) {
        throw new Error('シーンを更新するメディアファイルが選択されていません');
      }
      return audioAnalysis.updateScenes(mediaFile.id, scenes);
    },
    [mediaFile, audioAnalysis]
  );

  return {
    ...audioAnalysis,
    mediaFile,
    analyzeCurrentFile,
    regenerateCurrentPrompts,
    updateCurrentScenes,
    hasAnalysis: !!mediaFile?.analysis,
    isAudioFile: mediaFile?.type === 'audio'
  };
};

export default useAudioAnalysis;
