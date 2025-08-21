import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Music,
  Activity,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  VolumeX,
  Volume2,
  BarChart3,
  Zap
} from 'lucide-react';
import type { AudioTrack, Timeline, BPMAnalysis } from '@/types';
import { createAudioTrackFromFile, detectAudioBPM } from '../../utils/audio/audioAnalyzer';
import BPMDetectorComponent from '../audio/BPMDetector';
import WaveformDisplay from '../waveform/WaveformDisplay';

interface EnhancedAudioTimelineProps {
  timeline: Timeline;
  onTimelineUpdate: (timeline: Timeline) => void;
  playheadPosition: number;
  zoom: number;
  className?: string;
}

interface AudioProcessingState {
  isProcessing: boolean;
  progress: number;
  currentFile?: File;
  error?: string;
}

const EnhancedAudioTimeline: React.FC<EnhancedAudioTimelineProps> = ({
  timeline,
  onTimelineUpdate,
  playheadPosition,
  zoom,
  className = ''
}) => {
  const [processingState, setProcessingState] = useState<AudioProcessingState>({
    isProcessing: false,
    progress: 0
  });
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showBPMDetector, setShowBPMDetector] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Timeline scale (pixels per second)
  const scale = 40 * zoom;
  const trackHeight = 80; // Enhanced height for waveforms

  const timeToPixel = (time: number) => time * scale;
  const pixelToTime = (pixel: number) => pixel / scale;

  // 音声ファイルの処理
  const processAudioFile = useCallback(async (file: File, startTime: number = 0) => {
    setProcessingState({
      isProcessing: true,
      progress: 0,
      currentFile: file
    });

    try {
      // Step 1: ファイルの基本検証
      setProcessingState(prev => ({ ...prev, progress: 10 }));

      if (!file.type.startsWith('audio/')) {
        throw new Error('音声ファイルを選択してください');
      }

      // Step 2: AudioTrackを作成（BPM検出と波形生成を含む）
      setProcessingState(prev => ({ ...prev, progress: 30 }));

      const audioTrack = await createAudioTrackFromFile(file, file.name, startTime);

      setProcessingState(prev => ({ ...prev, progress: 80 }));

      // Step 3: タイムラインに追加
      const updatedTimeline: Timeline = {
        ...timeline,
        audioTracks: [...timeline.audioTracks, audioTrack],
        duration: Math.max(timeline.duration, audioTrack.startTime + audioTrack.duration)
      };

      onTimelineUpdate(updatedTimeline);
      setProcessingState(prev => ({ ...prev, progress: 100 }));

      console.log('✅ 音声トラック追加完了:', {
        name: audioTrack.name,
        duration: audioTrack.duration,
        bpm: audioTrack.bpm,
        beats: audioTrack.beats?.length || 0
      });

      // 成功状態を少し表示してからリセット
      setTimeout(() => {
        setProcessingState({ isProcessing: false, progress: 0 });
      }, 1000);

    } catch (error) {
      console.error('音声ファイル処理エラー:', error);
      setProcessingState({
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : '音声ファイルの処理に失敗しました'
      });

      // エラーを3秒後にクリア
      setTimeout(() => {
        setProcessingState({ isProcessing: false, progress: 0 });
      }, 3000);
    }
  }, [timeline, onTimelineUpdate]);

  // ドラッグ&ドロップハンドラー
  const handleDrop = useCallback(async (e: React.DragEvent, dropTime?: number) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      setProcessingState({
        isProcessing: false,
        progress: 0,
        error: '音声ファイルが見つかりません'
      });
      return;
    }

    // 複数ファイルの場合は順次処理
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const startTime = dropTime !== undefined ? dropTime + (i * 0.1) : 0; // 0.1秒間隔で配置
      await processAudioFile(file, startTime);
    }
  }, [processAudioFile]);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAudioFile(files[0]);
    }
  }, [processAudioFile]);

  // トラック削除
  const removeAudioTrack = useCallback((trackId: string) => {
    const updatedTimeline: Timeline = {
      ...timeline,
      audioTracks: timeline.audioTracks.filter(track => track.id !== trackId)
    };
    onTimelineUpdate(updatedTimeline);

    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }
  }, [timeline, onTimelineUpdate, selectedTrackId]);

  // トラックミュート切り替え
  const toggleTrackMute = useCallback((trackId: string) => {
    const updatedTracks = timeline.audioTracks.map(track =>
      track.id === trackId ? { ...track, muted: !track.muted } : track
    );

    const updatedTimeline: Timeline = {
      ...timeline,
      audioTracks: updatedTracks
    };

    onTimelineUpdate(updatedTimeline);
  }, [timeline, onTimelineUpdate]);

  // 選択されたトラック
  const selectedTrack = selectedTrackId
    ? timeline.audioTracks.find(track => track.id === selectedTrackId)
    : null;

  return (
    <div className={`bg-dark-900 rounded-lg border border-dark-700 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Enhanced Audio Timeline</h3>
            <p className="text-sm text-gray-400">
              音声波形とBPM検出付きタイムライン • {timeline.audioTracks.length} トラック
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {selectedTrack && (
            <button
              onClick={() => setShowBPMDetector(true)}
              className="flex items-center space-x-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>BPM検出</span>
            </button>
          )}

          <label className="flex items-center space-x-1 bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>音声追加</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
          </label>
        </div>
      </div>

      {/* 処理状態の表示 */}
      <AnimatePresence>
        {processingState.isProcessing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-dark-700 p-4 bg-blue-500/10"
          >
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-400">
                  {processingState.currentFile?.name} を処理中...
                </p>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingState.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-blue-400">
                {processingState.progress}%
              </span>
            </div>
          </motion.div>
        )}

        {processingState.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-dark-700 p-4 bg-red-500/10"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">{processingState.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 音声トラック一覧 */}
      <div className="divide-y divide-dark-700">
        {timeline.audioTracks.length === 0 ? (
          <div
            className={`p-8 text-center transition-colors ${
              dragOver ? 'bg-cyan-500/20 border-cyan-500' : 'bg-dark-800'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            <div className="max-w-sm mx-auto">
              <Upload className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">
                音声ファイルを追加
              </h4>
              <p className="text-sm text-gray-400 mb-4">
                音声ファイルをドラッグ&ドロップするか、「音声追加」ボタンをクリックしてください。
                自動的にBPM検出と波形解析が行われます。
              </p>
              <p className="text-xs text-gray-500">
                対応形式: MP3, WAV, AAC, OGG
              </p>
            </div>
          </div>
        ) : (
          timeline.audioTracks.map((track) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 hover:bg-dark-800/50 transition-all cursor-pointer ${
                selectedTrackId === track.id ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''
              }`}
              onClick={() => setSelectedTrackId(track.id)}
            >
              <div className="flex items-start space-x-4">
                {/* トラック情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white truncate">
                      {track.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {track.bpm && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                          {track.bpm} BPM
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrackMute(track.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          track.muted 
                            ? 'text-red-400 hover:text-red-300' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAudioTrack(track.id);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mb-3">
                    長さ: {Math.floor(track.duration / 60)}:{(track.duration % 60).toFixed(1).padStart(4, '0')} •
                    開始: {track.startTime.toFixed(1)}s •
                    ビート: {track.beats?.length || 0}個
                  </div>

                  {/* 波形表示 */}
                  {track.url && (
                    <div className="bg-dark-800 rounded-lg p-2">
                      <WaveformDisplay
                        audioTrack={track}
                        width={Math.min(400, timeToPixel(track.duration))}
                        height={60}
                        startTime={0}
                        duration={track.duration}
                        zoom={1}
                        color={track.muted ? '#6b7280' : '#06b6d4'}
                        showBeats={true}
                        className="w-full"
                        onWaveformClick={(time) => {
                          console.log(`Waveform clicked at ${time}s`);
                          // プレイヘッド移動の実装をここに追加
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* BPM検出モーダル */}
      <AnimatePresence>
        {showBPMDetector && selectedTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowBPMDetector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-lg border border-dark-600 p-6 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <BPMDetectorComponent
                audioFile={{
                  name: selectedTrack.name,
                  url: selectedTrack.url,
                  duration: selectedTrack.duration
                } as any}
                onBPMDetected={(analysis: BPMAnalysis) => {
                  // BPM検出結果をトラックに反映
                  const updatedTracks = timeline.audioTracks.map(track => 
                    track.id === selectedTrack.id 
                      ? {
                          ...track,
                          bpm: analysis.bpm,
                          beats: analysis.beatTimes,
                          bars: analysis.bars
                        }
                      : track
                  );
                  
                  onTimelineUpdate({
                    ...timeline,
                    audioTracks: updatedTracks
                  });
                  
                  console.log('✅ BPM検出結果をトラックに反映:', analysis);
                }}
                onAnalysisComplete={() => {
                  setShowBPMDetector(false);
                }}
                onError={(error) => {
                  console.error('BPM検出エラー:', error);
                }}
              />
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowBPMDetector(false)}
                  className="bg-dark-600 hover:bg-dark-500 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  閉じる
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedAudioTimeline;