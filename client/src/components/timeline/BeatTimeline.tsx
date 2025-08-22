import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Magnet, Settings, Info, ChevronDown, Play, Target, Zap, AlertCircle } from 'lucide-react';

import {
  BeatTimelineProps,
  TimelineClip,
  BeatGrid,
  BPMAnalysis,
  Timeline,
} from '../../types';

// 新しい共通フックをインポート
import {
  useTimelineScale,
  useTimelineSnap,
  useTimelineDrag,
  useSnapControl
} from '../../hooks/timeline';

/**
 * ビートスナップ機能付き拡張タイムライン (改良版)
 * - quantizeStrengthが実際のスナップ計算に反映
 * - スナップ閾値が拍長ベース + ピクセル換算
 * - ドラッグ更新がrequestAnimationFrameでスロットリング
 * - Pointer Eventsに移行
 * - Magneticモード（M キー）でスナップのオン/オフ切り替え
 */
const BeatTimeline: React.FC<BeatTimelineProps> = ({
  timeline,
  playheadPosition,
  zoom,
  onClipSelect,
  onTimelineUpdate,
  onPlayheadChange,
  bpmAnalysis,
  beatGrid,
  onBeatGridChange,
  showBeatMarkers = true,
  showBarMarkers = true,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [draggedClip, setDraggedClip] = useState<TimelineClip | null>(null);
  const [snapPreview, setSnapPreview] = useState<number | null>(null);
  const [showGridSettings, setShowGridSettings] = useState(false);

  // ========== 新しい共通フック使用 ==========
  
  // 1. タイムラインスケール管理
  const { pixelsPerSecond, timeToPixel, pixelToTime } = useTimelineScale({
    zoom,
    basePixelsPerSecond: 50,
    minPixelsPerSecond: 10,
    maxPixelsPerSecond: 200
  });

  // 2. スナップ制御（Magneticモード付き）
  const {
    beatGrid: effectiveBeatGrid,
    magneticMode,
    isSnapEnabled,
    updateBeatGrid,
    toggleSnap,
    toggleMagneticMode,
    setQuantizeStrength,
    presets,
    statusText
  } = useSnapControl({
    initialBeatGrid: beatGrid,
    onBeatGridChange,
    enableShortcuts: true
  });

  // 3. 高性能スナップ計算
  const {
    snapPoints: visualSnapPoints,
    findNearestSnapPoint,
    getSnapPreview,
    calculateSnapDistance,
    isEnabled: snapEnabled
  } = useTimelineSnap({
    enabled: isSnapEnabled,
    bpmAnalysis,
    beatGrid: effectiveBeatGrid,
    pixelsPerSecond,
    timelineDuration: timeline.duration,
    customSnapPoints: []
  });

  // 4. Pointer Events ベースドラッグ
  const {
    dragState,
    registerElement,
    isDragging
  } = useTimelineDrag({
    enabled: true,
    throttle: true, // requestAnimationFrame でスロットリング
    onDragStart: (e) => {
      // ドラッグ対象のクリップを特定
      const target = e.target as HTMLElement;
      const clipElement = target.closest('[data-clip-id]');
      if (clipElement) {
        const clipId = clipElement.getAttribute('data-clip-id');
        const clip = timeline.clips.find(c => c.id === clipId);
        if (clip) {
          setDraggedClip(clip);
          setSelectedClipId(clip.id);
          onClipSelect(clip);
        }
      }
    },
    onDragMove: (e, deltaX, deltaY) => {
      if (!draggedClip || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const rawTime = pixelToTime(currentX);

      // スナップ処理（quantizeStrength と BPM に基づく適応的閾値）
      const snapResult = findNearestSnapPoint(rawTime);
      const snappedTime = Math.max(0, snapResult.snappedTime);

      // スナップ予告を更新
      setSnapPreview(snapResult.wasSnapped ? snappedTime : null);

      // クリップ位置の更新（requestAnimationFrame でスロットリング済み）
      const updatedClip: TimelineClip = {
        ...draggedClip,
        startTime: snappedTime,
      };

      const updatedTimeline: Timeline = {
        ...timeline,
        clips: timeline.clips.map((clip) => 
          clip.id === draggedClip.id ? updatedClip : clip
        ),
      };

      onTimelineUpdate(updatedTimeline);
    },
    onDragEnd: () => {
      setDraggedClip(null);
      setSnapPreview(null);
    }
  });

  // ========== レンダリング用の計算 ==========
  
  const timelineWidth = Math.max(800, timeline.duration * pixelsPerSecond);
  const trackHeight = 80;
  const headerHeight = 60;

  // ビートマーカーの計算（表示用）
  const beatMarkers = useMemo(() => {
    if (!bpmAnalysis || !showBeatMarkers) return [];
    return bpmAnalysis.beatTimes.map((time) => ({
      time,
      x: timeToPixel(time),
      type: 'beat' as const,
    }));
  }, [bpmAnalysis, timeToPixel, showBeatMarkers]);

  // 小節マーカーの計算（表示用）
  const barMarkers = useMemo(() => {
    if (!bpmAnalysis || !showBarMarkers) return [];
    return bpmAnalysis.bars.map((time) => ({
      time,
      x: timeToPixel(time),
      type: 'bar' as const,
    }));
  }, [bpmAnalysis, timeToPixel, showBarMarkers]);

  // プレイヘッドクリック処理
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawTime = pixelToTime(x);

    const snapResult = findNearestSnapPoint(rawTime);
    const snappedTime = Math.max(0, Math.min(snapResult.snappedTime, timeline.duration));
    
    onPlayheadChange?.(snappedTime);
  }, [pixelToTime, findNearestSnapPoint, timeline.duration, onPlayheadChange, isDragging]);

  // タイムライン要素にドラッグハンドラーを登録
  useEffect(() => {
    if (timelineRef.current) {
      registerElement(timelineRef.current);
    }
  }, [registerElement]);

  return (
    <div className="bg-dark-900 border-t border-dark-700">
      {/* ========== ヘッダー（改良版） ========== */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左側：BPM情報 + スナップ状態 */}
          <div className="flex items-center space-x-4">
            {bpmAnalysis && (
              <div className="flex items-center space-x-2 bg-purple-500/20 px-3 py-1.5 rounded-lg">
                <Play className="w-3 h-3 text-purple-400" />
                <span className="text-sm font-medium text-white">{bpmAnalysis.bpm} BPM</span>
                <span className="text-xs text-gray-400">
                  {bpmAnalysis.timeSignature.numerator}/{bpmAnalysis.timeSignature.denominator}
                </span>
              </div>
            )}

            {/* スナップ状態表示 */}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
              magneticMode 
                ? 'bg-yellow-500/20 text-yellow-400'
                : isSnapEnabled 
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
            }`}>
              {magneticMode ? (
                <Zap className="w-3 h-3" />
              ) : isSnapEnabled ? (
                <Magnet className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              <span>{statusText}</span>
            </div>

            <div className="text-sm text-gray-400">
              {timeline.clips.length}個のクリップ • {Math.floor(timeline.duration / 60)}:
              {(timeline.duration % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>

          {/* 右側：スナップ制御 */}
          <div className="flex items-center space-x-2">
            {/* Magneticモードトグル */}
            <button
              onClick={toggleMagneticMode}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                magneticMode 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
              title="Magneticモード切り替え (M キー)"
            >
              <Zap className="w-3 h-3" />
              <span>Magnetic</span>
            </button>

            {/* スナップトグル */}
            <button
              onClick={toggleSnap}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                isSnapEnabled ? 'bg-purple-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
              title="スナップ切り替え (S キー)"
            >
              <Magnet className="w-3 h-3" />
              <span>スナップ</span>
            </button>

            {/* 詳細設定 */}
            <button
              onClick={() => setShowGridSettings(!showGridSettings)}
              className="flex items-center space-x-1 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-all"
            >
              <Settings className="w-3 h-3" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showGridSettings ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========== グリッド設定パネル（改良版） ========== */}
        <AnimatePresence>
          {showGridSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-dark-700"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* ビートスナップ */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={effectiveBeatGrid.snapToBeat}
                    onChange={(e) => updateBeatGrid({ snapToBeat: e.target.checked })}
                    className="w-4 h-4 text-purple-500 bg-dark-700 border-dark-600 rounded"
                  />
                  <span className="text-sm text-gray-300">ビートにスナップ</span>
                </label>

                {/* 小節スナップ */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={effectiveBeatGrid.snapToBar}
                    onChange={(e) => updateBeatGrid({ snapToBar: e.target.checked })}
                    className="w-4 h-4 text-purple-500 bg-dark-700 border-dark-600 rounded"
                  />
                  <span className="text-sm text-gray-300">小節にスナップ</span>
                </label>

                {/* サブディビジョン */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">分割:</span>
                  <select
                    value={effectiveBeatGrid.subdivisions}
                    onChange={(e) => updateBeatGrid({ subdivisions: Number(e.target.value) as 1 | 2 | 4 | 8 | 16 })}
                    className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>1/2</option>
                    <option value={4}>1/4</option>
                    <option value={8}>1/8</option>
                    <option value={16}>1/16</option>
                  </select>
                </div>

                {/* クオンタイズ強度（実際に反映されるように修正） */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">強度:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={effectiveBeatGrid.quantizeStrength}
                    onChange={(e) => setQuantizeStrength(Number(e.target.value))}
                    className="flex-1"
                    title={`スナップ距離: ${bpmAnalysis ? calculateSnapDistance(0).toFixed(3) : 'N/A'}s`}
                  />
                  <span className="text-xs text-gray-400 w-8">
                    {Math.round(effectiveBeatGrid.quantizeStrength * 100)}%
                  </span>
                </div>
              </div>

              {/* プリセットボタン */}
              <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-dark-700">
                <span className="text-sm text-gray-400">プリセット:</span>
                <button
                  onClick={presets.strict}
                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                  title="Ctrl+1"
                >
                  厳密
                </button>
                <button
                  onClick={presets.medium}
                  className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30 transition-colors"
                  title="Ctrl+2"
                >
                  中程度
                </button>
                <button
                  onClick={presets.loose}
                  className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                  title="Ctrl+3"
                >
                  緩い
                </button>
                <button
                  onClick={presets.off}
                  className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs hover:bg-gray-500/30 transition-colors"
                  title="Ctrl+0"
                >
                  無効
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========== タイムライン本体（改良版） ========== */}
      <div className="relative overflow-x-auto overflow-y-hidden">
        <div
          ref={timelineRef}
          className="relative bg-dark-900 cursor-pointer min-h-[200px]"
          style={{ width: timelineWidth }}
          onClick={handleTimelineClick}
        >
          {/* ビートマーカー */}
          {beatMarkers.map((marker, index) => (
            <div
              key={`beat-${index}`}
              className="absolute top-0 bottom-0 w-px bg-purple-400/30 pointer-events-none"
              style={{ left: marker.x }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <div className="w-1 h-1 bg-purple-400 rounded-full" />
              </div>
            </div>
          ))}

          {/* 小節マーカー */}
          {barMarkers.map((marker, index) => (
            <div
              key={`bar-${index}`}
              className="absolute top-0 bottom-0 w-px bg-purple-500/60 pointer-events-none"
              style={{ left: marker.x }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
              </div>
              <div className="absolute top-2 left-2 text-xs text-purple-400 font-mono">
                {Math.floor(marker.time / (60 / ((bpmAnalysis?.bpm || 120) * 1)) / 4) + 1}
              </div>
            </div>
          ))}

          {/* スナップ予告線（改良版） */}
          {snapPreview !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-yellow-400 pointer-events-none z-10 animate-pulse"
              style={{ left: timeToPixel(snapPreview) }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Target className="w-3 h-3 text-yellow-400 drop-shadow-lg" />
              </div>
            </div>
          )}

          {/* クリップ表示（改良版） */}
          {timeline.clips.map((clip, layerIndex) => {
            const clipX = timeToPixel(clip.startTime);
            const clipWidth = timeToPixel(clip.duration);
            const clipY = headerHeight + layerIndex * (trackHeight + 10);

            return (
              <motion.div
                key={clip.id}
                data-clip-id={clip.id} // ドラッグ対象の特定用
                className={`absolute bg-gradient-to-r from-blue-500 to-blue-600 rounded cursor-move border-2 ${
                  selectedClipId === clip.id
                    ? 'border-purple-400 shadow-lg shadow-purple-400/20'
                    : 'border-blue-400/30 hover:border-blue-400'
                } transition-all ${isDragging && draggedClip?.id === clip.id ? 'z-50' : ''}`}
                style={{
                  left: clipX,
                  top: clipY,
                  width: Math.max(clipWidth, 50),
                  height: trackHeight,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-2 h-full flex flex-col justify-between text-white text-xs">
                  <div className="font-medium truncate">
                    {timeline.clips.findIndex((c) => c.id === clip.id) + 1}. クリップ
                  </div>
                  <div className="text-blue-200 text-xs">{clip.duration.toFixed(1)}s</div>
                </div>

                {/* クリップのビート同期インジケーター */}
                {isSnapEnabled && bpmAnalysis && (
                  <div className="absolute top-1 right-1">
                    <Magnet className="w-3 h-3 text-purple-300" />
                  </div>
                )}

                {/* ドラッグ中の視覚的フィードバック */}
                {isDragging && draggedClip?.id === clip.id && (
                  <div className="absolute inset-0 bg-yellow-400/20 border border-yellow-400 rounded pointer-events-none" />
                )}
              </motion.div>
            );
          })}

          {/* プレイヘッド */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
            style={{ left: timeToPixel(playheadPosition) }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="w-3 h-3 bg-red-500 rotate-45" />
            </div>
          </div>

          {/* 時間軸 */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-dark-800 border-b border-dark-700">
            {Array.from({ length: Math.ceil(timeline.duration) + 1 }, (_, i) => (
              <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: timeToPixel(i) }}>
                <div className="w-px h-2 bg-gray-600" />
                <span className="ml-1 text-xs text-gray-400 font-mono">
                  {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== ヘルプテキスト（改良版） ========== */}
      <div className="bg-dark-800 border-t border-dark-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <Info className="w-3 h-3" />
            <span>
              {isSnapEnabled
                ? `ビートスナップ有効 (強度: ${Math.round(effectiveBeatGrid.quantizeStrength * 100)}%) - クリップを拍に合わせて自動調整`
                : magneticMode
                ? 'Magneticモード - 一時的にスナップを無効化しています'
                : 'スナップ無効 - 自由に配置できます'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span><kbd className="px-1 bg-dark-700 rounded">M</kbd> Magnetic</span>
            <span><kbd className="px-1 bg-dark-700 rounded">S</kbd> スナップ</span>
            <span><kbd className="px-1 bg-dark-700 rounded">Ctrl+1-3</kbd> プリセット</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeatTimeline;
