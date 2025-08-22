import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Zap,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import type { AudioTrack, Timeline, BPMAnalysis } from '@/types';
import { createAudioTrackFromFile, detectAudioBPM } from '../../utils/audio/audioAnalyzer';
import BPMDetectorComponent from '../audio/BPMDetector';
import WaveformDisplay from '../waveform/WaveformDisplay';

// 新しい共通フックをインポート
import {
  useTimelineScale,
  useTimelineDrag
} from '../../hooks/timeline';

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

/**
 * Enhanced Audio Timeline (改良版)
 * - requestAnimationFrameでドラッグスロットリング
 * - Pointer Eventsに移行
 * - 共通スケール管理
 * - トラック折りたたみ・ミュート・削除
 * - パフォーマンス最適化
 */
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
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());
  const [draggedTrack, setDraggedTrack] = useState<AudioTrack | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<number | null>(null);

  // ========== 共通フック使用 ==========
  
  // タイムラインスケール管理
  const { pixelsPerSecond, timeToPixel, pixelToTime } = useTimelineScale({
    zoom,
    basePixelsPerSecond: 40,
    minPixelsPerSecond: 10,
    maxPixelsPerSecond: 160
  });

  // Pointer Events ベースドラッグ（オーディオトラック移動用）
  const {
    dragState,
    registerElement: registerDragElement,
    isDragging: isDraggingTrack
  } = useTimelineDrag({
    enabled: true,
    throttle: true, // requestAnimationFrame でスロットリング
    onDragStart: (e) => {
      const target = e.target as HTMLElement;
      const trackElement = target.closest('[data-track-id]');
      if (trackElement) {
        const trackId = trackElement.getAttribute('data-track-id');
        const track = timeline.audioTracks.find(t => t.id === trackId);
        if (track) {
          setDraggedTrack(track);
          setSelectedTrackId(track.id);
        }
      }
    },
    onDragMove: (e, deltaX, deltaY) => {
      if (!draggedTrack || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const newTime = Math.max(0, pixelToTime(currentX));

      // デバウンス付きで更新（パフォーマンス向上）
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = window.setTimeout(() => {
        const updatedTrack: AudioTrack = {
          ...draggedTrack,
          startTime: newTime,
        };

        const updatedTracks = timeline.audioTracks.map(track =>
          track.id === draggedTrack.id ? updatedTrack : track
        );

        const updatedTimeline: Timeline = {
          ...timeline,
          audioTracks: updatedTracks,
          duration: Math.max(timeline.duration, newTime + draggedTrack.duration)
        };

        onTimelineUpdate(updatedTimeline);
      }, 16); // ~60fps での更新
    },
    onDragEnd: () => {
      setDraggedTrack(null);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    }
  });

  // レイアウト定数
  const trackHeight = 80; // Enhanced height for waveforms
  const collapsedTrackHeight = 40; // Collapsed state

  // 音声ファイルの処理（改良版）
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

  // ドラッグ&ドロップハンドラー（改良版）
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

    // 折りたたみ状態もクリア
    setCollapsedTracks(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackId);
      return newSet;
    });
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

  // トラック折りたたみ切り替え
  const toggleTrackCollapse = useCallback((trackId: string) => {
    setCollapsedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  // 全トラック折りたたみ切り替え
  const toggleAllTracksCollapse = useCallback(() => {
    if (collapsedTracks.size === timeline.audioTracks.length) {
      // 全て展開
      setCollapsedTracks(new Set());
    } else {
      // 全て折りたたみ
      setCollapsedTracks(new Set(timeline.audioTracks.map(t => t.id)));
    }
  }, [collapsedTracks.size, timeline.audioTracks]);

  // タイムラインクリック処理
  const handleTimelineClick = useCallback((e: React.MouseEvent, trackId: string) => {
    if (!timelineRef.current || isDraggingTrack) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = pixelToTime(x);
    
    console.log(`Timeline clicked at ${clickTime.toFixed(2)}s for track ${trackId}`);
    // プレイヘッド移動の実装をここに追加
  }, [pixelToTime, isDraggingTrack]);

  // ドラッグ要素の登録
  useEffect(() => {
    if (timelineRef.current) {
      registerDragElement(timelineRef.current);
    }
  }, [registerDragElement]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // 選択されたトラック
  const selectedTrack = selectedTrackId
    ? timeline.audioTracks.find(track => track.id === selectedTrackId)
    : null;

  return (
    <div className={`bg-dark-900 rounded-lg border border-dark-700 ${className}`}>
      {/* ========== ヘッダー（改良版） ========== */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Enhanced Audio Timeline</h3>
            <p className="text-sm text-gray-400">
              音声波形とBPM検出付きタイムライン • {timeline.audioTracks.length} トラック
              {collapsedTracks.size > 0 && ` • ${collapsedTracks.size} 折りたたみ中`}
            </p>
          </div>
          
          {/* ドラッグ状態インジケーター */}
          {isDraggingTrack && (
            <div className="text-sm text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Moving track...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 全トラック折りたたみ切り替え */}
          {timeline.audioTracks.length > 0 && (
            <button
              onClick={toggleAllTracksCollapse}
              className="flex items-center space-x-1 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-all"
              title={collapsedTracks.size === timeline.audioTracks.length ? "全て展開" : "全て折りたたみ"}
            >
              {collapsedTracks.size === timeline.audioTracks.length ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>{collapsedTracks.size === timeline.audioTracks.length ? "展開" : "折りたたみ"}</span>
            </button>
          )}

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

      {/* ========== 処理状態の表示 ========== */}
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

      {/* ========== 音声トラック一覧（改良版） ========== */}
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
          <div 
            ref={timelineRef}
            className="relative"
            style={{ width: Math.max(800, timeToPixel(timeline.duration)) }}
          >
            {timeline.audioTracks.map((track) => {
              const isCollapsed = collapsedTracks.has(track.id);
              const currentHeight = isCollapsed ? collapsedTrackHeight : trackHeight;
              
              return (
                <motion.div
                  key={track.id}
                  data-track-id={track.id} // ドラッグ対象の特定用
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    height: currentHeight
                  }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden border-b border-dark-700 bg-dark-850 hover:bg-dark-800/50 transition-all cursor-pointer ${
                    selectedTrackId === track.id ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''
                  } ${isDraggingTrack && draggedTrack?.id === track.id ? 'z-50' : ''}`}
                  style={{ height: currentHeight }}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  {/* トラック情報ヘッダー */}
                  <div className="flex items-center justify-between p-2 bg-dark-800/50">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {/* 折りたたみボタン */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrackCollapse(track.id);
                        }}
                        className="p-1 hover:bg-dark-600 rounded transition-colors"
                        title={isCollapsed ? "展開" : "折りたたみ"}
                      >
                        {isCollapsed ? (
                          <EyeOff className="w-3 h-3 text-gray-400" />
                        ) : (
                          <Eye className="w-3 h-3 text-gray-400" />
                        )}
                      </button>

                      <h4 className="text-sm font-medium text-white truncate">
                        {track.name}
                      </h4>

                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        {track.bpm && (
                          <span className="bg-purple-500/20 text-purple-400 px-1 rounded">
                            {track.bpm} BPM
                          </span>
                        )}
                        <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toFixed(1).padStart(4, '0')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* ミュートボタン */}
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
                        title={track.muted ? "ミュート解除" : "ミュート"}
                      >
                        {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      {/* 削除ボタン */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAudioTrack(track.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 波形表示エリア */}
                  {!isCollapsed && (
                    <div 
                      className="relative h-full p-2"
                      onClick={(e) => handleTimelineClick(e, track.id)}
                    >
                      {track.url ? (
                        <div
                          className="relative"
                          style={{
                            left: timeToPixel(track.startTime),
                            width: timeToPixel(track.duration),
                            height: trackHeight - 40, // ヘッダー分を除外
                          }}
                        >
                          <WaveformDisplay
                            audioTrack={track}
                            width={timeToPixel(track.duration)}
                            height={trackHeight - 40}
                            startTime={0}
                            duration={track.duration}
                            zoom={1}
                            color={track.muted ? '#6b7280' : '#06b6d4'}
                            showBeats={true}
                            className="w-full rounded border border-cyan-500/30 bg-cyan-500/10"
                            onWaveformClick={(time) => {
                              console.log(`Waveform clicked at ${time}s`);
                            }}
                          />
                          
                          {/* ドラッグ中の視覚的フィードバック */}
                          {isDraggingTrack && draggedTrack?.id === track.id && (
                            <div className="absolute inset-0 border-2 border-yellow-400 rounded pointer-events-none animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center h-full px-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                          <Activity className="w-3 h-3 mr-1 text-cyan-400" />
                          <span className="text-xs truncate text-cyan-300">
                            波形データなし
                          </span>
                        </div>
                      )}

                      {/* プレイヘッド */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                        style={{ left: timeToPixel(playheadPosition) }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                          <div className="w-2 h-2 bg-red-500 rotate-45" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 折りたたみ状態でのミニ波形 */}
                  {isCollapsed && track.url && (
                    <div className="flex items-center px-2 h-full">
                      <div className="flex-1 h-4 bg-cyan-500/20 rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/40" 
                             style={{ width: `${Math.min(100, (track.duration / timeline.duration) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== BPM検出モーダル ========== */}
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
