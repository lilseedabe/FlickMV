import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Play,
  Pause,
  Loader,
  CheckCircle,
  AlertCircle,
  Info,
  Volume2,
  BarChart3,
  Zap
} from 'lucide-react';

import { BPMDetectorProps, BPMAnalysis } from '../../types';
import { BPMDetector, loadAudioFile } from '../../utils/audio/bpmDetector';

/**
 * BPM検出コンポーネント
 * 初心者にもわかりやすいUI/UXを提供
 */
const BPMDetectorComponent: React.FC<BPMDetectorProps> = ({
  audioFile,
  onBPMDetected,
  onAnalysisStart,
  onAnalysisComplete,
  onError
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BPMAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  /**
   * BPM検出の実行 - 軽量版アルゴリズム使用（高速処理）
   */
  const detectBPM = useCallback(async () => {
    if (!audioFile) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setProgress(0);
      onAnalysisStart?.();

      console.log('🎵 軽量版BPM検出を開始します（高速処理）');

      // 進行状況の更新（現実的なタイミング）
      setProgress(15);
      await new Promise(resolve => setTimeout(resolve, 100)); // UI更新用

      // 音声ファイルをAudioBufferに変換（改良版）
      let arrayBuffer: ArrayBuffer;
      
      if (audioFile.originalFile) {
        // 原始Fileオブジェクトがある場合は直接使用（最も信頼性が高い）
        console.log('📁 原始Fileオブジェクトを使用してBPM検出');
        arrayBuffer = await audioFile.originalFile.arrayBuffer();
      } else if (audioFile.url.startsWith('blob:')) {
        // Blob URLの場合はフォールバック
        console.log('🌐 Blob URLを使用してBPM検出');
        try {
          const response = await fetch(audioFile.url);
          if (!response.ok) {
            throw new Error(`Blob URLの読み込みに失敗: ${response.status}`);
          }
          arrayBuffer = await response.arrayBuffer();
        } catch (fetchError) {
          console.error('Blob URLの取得に失敗:', fetchError);
          throw new Error('音声ファイルの読み込みに失敗しました。ファイルを再アップロードしてください。');
        }
      } else {
        // 通常のURLの場合
        console.log('🌐 通常のURLを使用してBPM検出');
        try {
          const response = await fetch(audioFile.url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          arrayBuffer = await response.arrayBuffer();
        } catch (fetchError) {
          console.error('ファイルの取得に失敗:', fetchError);
          throw new Error('音声ファイルの読み込みに失敗しました。ネットワーク接続を確認してください。');
        }
      }
      
      setProgress(35);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 50));

      // 軽量版BPM検出器の作成と実行
      console.log('🚀 高速アルゴリズムで解析中...');
      const detector = new BPMDetector();
      setProgress(65);
      await new Promise(resolve => setTimeout(resolve, 100));

      const analysis = await detector.detectBPM(buffer);
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 結果の保存と通知
      setResult(analysis);
      onBPMDetected(analysis);
      setProgress(100);

      console.log('✅ 軽量版BPM検出完了:', {
        bpm: analysis.bpm,
        confidence: Math.round(analysis.confidence * 100) + '%',
        beats: analysis.beatTimes.length,
        bars: analysis.bars.length,
        processingTime: 'Fast'
      });

      // クリーンアップ
      detector.dispose();
      onAnalysisComplete?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'BPM検出中にエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('❌ BPM検出エラー:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioFile, onBPMDetected, onAnalysisStart, onAnalysisComplete, onError]);

  // 音声プレビュー再生 - 改良版
  const togglePlayback = useCallback(async () => {
    if (!audioBuffer && !audioFile.originalFile) return;

    try {
      if (isPlaying) {
        // 停止
        audioContext?.suspend();
        setIsPlaying(false);
      } else {
        // 再生（原始Fileオブジェクトを使用）
        const ctx = new AudioContext();
        
        let currentAudioBuffer = audioBuffer;
        if (!currentAudioBuffer && audioFile.originalFile) {
          // AudioBufferがない場合は新しく作成
          console.log('📁 再生用にAudioBufferを作成');
          const arrayBuffer = await audioFile.originalFile.arrayBuffer();
          currentAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
        }
        
        if (!currentAudioBuffer) {
          throw new Error('音声バッファの作成に失敗しました');
        }
        
        const source = ctx.createBufferSource();
        source.buffer = currentAudioBuffer;
        source.connect(ctx.destination);
        source.start();

        setAudioContext(ctx);
        setIsPlaying(true);

        // 再生終了時の処理
        source.onended = () => {
          setIsPlaying(false);
        };
      }
    } catch (err) {
      console.error('音声再生エラー:', err);
      alert('音声ファイルの再生に失敗しました。ファイル形式をご確認ください。');
    }
  }, [audioBuffer, audioContext, isPlaying, audioFile.originalFile]);

  // 信頼度に基づくアドバイス
  const getConfidenceMessage = (confidence: number) => {
    if (confidence >= 0.8) return { message: '高精度な検出結果です！', color: 'text-green-400' };
    if (confidence >= 0.6) return { message: '良好な検出結果です。', color: 'text-blue-400' };
    if (confidence >= 0.4) return { message: '中程度の精度です。手動調整を推奨。', color: 'text-yellow-400' };
    if (confidence >= 0.2) return { message: '低精度です。BPMを手動で確認してください。', color: 'text-orange-400' };
    return { message: 'とても低い精度です。別の楽曲で試してください。', color: 'text-red-400' };
  };

  // ヘルプテキスト
  const getHelpText = () => {
    if (isAnalyzing) return '軽量版アルゴリズムでBPMを高速解析中です。少々お待ちください...';
    if (result) {
      const { message } = getConfidenceMessage(result.confidence);
      return `BPM検出完了！${message} タイムラインでビートマーカーを確認できます。`;
    }
    if (error) return 'エラーが発生しました。音声ファイルを確認してもう一度お試しください。';
    return 'このボタンを押すと、楽曲のテンポ（BPM）を高速アルゴリズムで検出します。';
  };

  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
      {/* ヘッダー */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
          <Music className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">BPM検出</h3>
          <p className="text-sm text-gray-400">楽曲のテンポを自動で解析</p>
        </div>
      </div>

      {/* 音声ファイル情報 */}
      <div className="bg-dark-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-sm font-medium text-white">{audioFile.name}</p>
              <p className="text-xs text-gray-400">
                {audioFile.duration ? `${Math.floor(audioFile.duration / 60)}:${(audioFile.duration % 60).toFixed(0).padStart(2, '0')}` : '不明'}
                {audioFile.size && ` • ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB`}
              </p>
            </div>
          </div>

          {/* プレビュー再生ボタン */}
          {(audioBuffer || audioFile.originalFile) && (
            <button
              onClick={togglePlayback}
              className="flex items-center space-x-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm transition-all"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? '停止' : '試聴'}</span>
            </button>
          )}
        </div>
      </div>

      {/* BPM検出ボタン */}
      <button
        onClick={detectBPM}
        disabled={isAnalyzing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
          isAnalyzing
            ? 'bg-gray-600 cursor-not-allowed'
            : result
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-purple-500 hover:bg-purple-600'
        } text-white`}
      >
        {isAnalyzing ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>解析中... {progress}%</span>
          </>
        ) : result ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>再検出</span>
          </>
        ) : (
          <>
            <BarChart3 className="w-4 h-4" />
            <span>BPMを検出</span>
          </>
        )}
      </button>

      {/* 進行状況バー */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <div className="w-full bg-dark-700 rounded-full h-2">
              <motion.div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 結果表示 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">検出完了</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{result.bpm}</div>
                <div className="text-xs text-gray-400">BPM</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceMessage(result.confidence).color}`}>
                  {Math.round(result.confidence * 100)}%
                </div>
                <div className="text-xs text-gray-400">信頼度</div>
              </div>
            </div>
            
            {/* 信頼度メッセージ */}
            <div className={`text-center text-sm ${getConfidenceMessage(result.confidence).color} mb-2`}>
              {getConfidenceMessage(result.confidence).message}
            </div>

            <div className="mt-3 pt-3 border-t border-green-500/20">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>ビート数: {result.beatTimes.length}</span>
                <span>小節数: {result.bars.length}</span>
                <span>拍子: {result.timeSignature.numerator}/{result.timeSignature.denominator}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* エラー表示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">エラー</span>
            </div>
            <p className="text-sm text-gray-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ヘルプテキスト */}
      <div className="mt-4 flex items-start space-x-2 text-xs text-gray-400">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <p>{getHelpText()}</p>
      </div>

      {/* 軽量版アルゴリズムの説明 */}
      <AnimatePresence>
        {result && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">軽量版アルゴリズム</span>
              </div>
              <div className="text-xs text-blue-300 space-y-1">
                <p>• エネルギーベースの高速ビート検出</p>
                <p>• 中央値を使用したBPM算出</p>
                <p>• ブラウザ環境での高速処理に特化</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">次のステップ</span>
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <p>• タイムラインでビートマーカーを確認できます</p>
                <p>• ビートスナップ機能でクリップを正確に配置</p>
                <p>• BPMに合わせたプリセットを使用可能</p>
                <p>• 信頼度が低い場合は手動で調整を推奨</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BPMDetectorComponent;