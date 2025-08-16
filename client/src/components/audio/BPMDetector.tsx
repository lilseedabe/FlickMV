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

  // BPM検出の実行
  const detectBPM = useCallback(async () => {
    if (!audioFile) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setProgress(0);
      onAnalysisStart?.();

      console.log('🎵 BPM検出を開始します');

      // 進行状況の更新（UI向け）
      setProgress(20);

      // 音声ファイルをAudioBufferに変換
      // 注意: 実運用では URL から fetch して ArrayBuffer -> AudioBuffer へ変換する
      const buffer = await loadAudioFile(new File([], audioFile.name));
      setAudioBuffer(buffer);
      setProgress(40);

      // BPM検出器の作成と実行
      const detector = new BPMDetector();
      setProgress(60);

      const analysis = await detector.detectBPM(buffer);
      setProgress(80);

      // 結果の保存と通知
      setResult(analysis);
      onBPMDetected(analysis);
      setProgress(100);

      console.log('✅ BPM検出完了:', analysis);

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

  // 音声プレビュー再生
  const togglePlayback = useCallback(async () => {
    if (!audioBuffer) return;

    try {
      if (isPlaying) {
        // 停止
        audioContext?.suspend();
        setIsPlaying(false);
      } else {
        // 再生
        const ctx = new AudioContext();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
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
    }
  }, [audioBuffer, audioContext, isPlaying]);

  // ヘルプテキスト
  const getHelpText = () => {
    if (isAnalyzing) return 'BPMを解析中です。少々お待ちください...';
    if (result) return 'BPMの検出が完了しました！タイムラインでビートマーカーを確認できます。';
    if (error) return 'エラーが発生しました。音声ファイルを確認してもう一度お試しください。';
    return 'このボタンを押すと、楽曲のテンポ（BPM）を自動検出します。';
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
          {audioBuffer && (
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

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{result.bpm}</div>
                <div className="text-xs text-gray-400">BPM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{Math.round(result.confidence * 100)}%</div>
                <div className="text-xs text-gray-400">信頼度</div>
              </div>
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

      {/* BPM検出後の機能案内 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">次のステップ</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• タイムラインでビートマーカーを確認できます</p>
              <p>• ビートスナップ機能でクリップを正確に配置</p>
              <p>• BPMに合わせたプリセットを使用可能</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BPMDetectorComponent;