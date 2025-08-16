import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Magnet, Settings, Info, ChevronDown, Play, Target } from 'lucide-react';

import {
  BeatTimelineProps,
  TimelineClip,
  BeatGrid,
  BPMAnalysis,
  Timeline,
} from '../../types';

/**
 * ビートスナップ機能付き拡張タイムライン
 * 初心者にもわかりやすいビート同期機能を提供
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
  const [isDragging, setIsDragging] = useState(false);
  const [draggedClip, setDraggedClip] = useState<TimelineClip | null>(null);
  const [snapPreview, setSnapPreview] = useState<number | null>(null);
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // タイムライン描画の基本設定
  const pixelsPerSecond = Math.max(10, 50 * zoom);
  const timelineWidth = Math.max(800, timeline.duration * pixelsPerSecond);
  const trackHeight = 80;
  const headerHeight = 60;

  // ビートマーカーの計算
  const beatMarkers = useMemo(() => {
    if (!bpmAnalysis || !showBeatMarkers) return [];
    return bpmAnalysis.beatTimes.map((time) => ({
      time,
      x: time * pixelsPerSecond,
      type: 'beat' as const,
    }));
  }, [bpmAnalysis, pixelsPerSecond, showBeatMarkers]);

  // 小節マーカーの計算
  const barMarkers = useMemo(() => {
    if (!bpmAnalysis || !showBarMarkers) return [];
    return bpmAnalysis.bars.map((time) => ({
      time,
      x: time * pixelsPerSecond,
      type: 'bar' as const,
    }));
  }, [bpmAnalysis, pixelsPerSecond, showBarMarkers]);

  // スナップポイントの計算
  const snapPoints = useMemo(() => {
    const points: number[] = [];

    if (beatGrid.snapToBeat && bpmAnalysis) {
      points.push(...bpmAnalysis.beatTimes);
    }

    if (beatGrid.snapToBar && bpmAnalysis) {
      points.push(...bpmAnalysis.bars);
    }

    // サブディビジョンの追加
    if (beatGrid.subdivisions > 1 && bpmAnalysis) {
      const subdivisionInterval = 60 / (bpmAnalysis.bpm * beatGrid.subdivisions);
      for (let t = 0; t <= timeline.duration; t += subdivisionInterval) {
        points.push(Number(t.toFixed(4)));
      }
    }

    return points.sort((a, b) => a - b);
  }, [beatGrid, bpmAnalysis, timeline.duration]);

  // 最も近いスナップポイントを見つける
  const findNearestSnapPoint = useCallback(
    (time: number): number => {
      if (!beatGrid.enabled || snapPoints.length === 0) return clampTime(time, 0, timeline.duration);

      const snapDistance = 0.1; // 0.1秒以内でスナップ
      let nearestPoint = time;
      let minDistance = snapDistance;

      for (let i = 0; i < snapPoints.length; i++) {
        const point = snapPoints[i];
        const distance = Math.abs(time - point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      }

      return clampTime(nearestPoint, 0, timeline.duration);
    },
    [beatGrid.enabled, snapPoints, timeline.duration],
  );

  // クリップのドラッグ処理
  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggedClip(clip);
    setSelectedClipId(clip.id);
    onClipSelect(clip);
  };

  // マウス移動時の処理
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !draggedClip || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawTime = x / pixelsPerSecond;

      // スナップ処理
      const snappedTime = findNearestSnapPoint(rawTime);
      setSnapPreview(snappedTime);

      // クリップ位置の更新
      const updatedClip: TimelineClip = {
        ...draggedClip,
        startTime: Math.max(0, snappedTime),
      };

      const updatedTimeline: Timeline = {
        ...timeline,
        clips: timeline.clips.map((clip) => (clip.id === draggedClip.id ? updatedClip : clip)),
      };

      onTimelineUpdate(updatedTimeline);
    },
    [isDragging, draggedClip, pixelsPerSecond, findNearestSnapPoint, timeline, onTimelineUpdate],
  );

  // マウスリリース時の処理
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedClip(null);
    setSnapPreview(null);
  }, []);

  // マウスイベントの登録
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // プレイヘッドクリック処理
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawTime = x / pixelsPerSecond;

    const snappedTime = findNearestSnapPoint(rawTime);
    onPlayheadChange?.(Math.max(0, Math.min(snappedTime, timeline.duration)));
  };

  // ビートグリッド設定の更新
  const updateBeatGrid = (updates: Partial<BeatGrid>) => {
    onBeatGridChange({ ...beatGrid, ...updates });
  };

  return (
    <div className="bg-dark-900 border-t border-dark-700">
      {/* ヘッダー */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左側：BPM情報 */}
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

            <div className="text-sm text-gray-400">
              {timeline.clips.length}個のクリップ • {Math.floor(timeline.duration / 60)}:
              {(timeline.duration % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>

          {/* 右側：グリッド設定 */}
          <div className="flex items-center space-x-2">
            {/* ビートスナップトグル */}
            <button
              onClick={() => updateBeatGrid({ enabled: !beatGrid.enabled })}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                beatGrid.enabled ? 'bg-purple-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
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

        {/* グリッド設定パネル */}
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
                    checked={beatGrid.snapToBeat}
                    onChange={(e) => updateBeatGrid({ snapToBeat: e.target.checked })}
                    className="w-4 h-4 text-purple-500 bg-dark-700 border-dark-600 rounded"
                  />
                  <span className="text-sm text-gray-300">ビートにスナップ</span>
                </label>

                {/* 小節スナップ */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={beatGrid.snapToBar}
                    onChange={(e) => updateBeatGrid({ snapToBar: e.target.checked })}
                    className="w-4 h-4 text-purple-500 bg-dark-700 border-dark-600 rounded"
                  />
                  <span className="text-sm text-gray-300">小節にスナップ</span>
                </label>

                {/* サブディビジョン */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">分割:</span>
                  <select
                    value={beatGrid.subdivisions}
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

                {/* クオンタイズ強度 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">強度:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={beatGrid.quantizeStrength}
                    onChange={(e) => updateBeatGrid({ quantizeStrength: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-400 w-8">{Math.round(beatGrid.quantizeStrength * 100)}%</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* タイムライン本体 */}
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

          {/* スナップ予告線 */}
          {snapPreview !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-yellow-400 pointer-events-none z-10"
              style={{ left: snapPreview * pixelsPerSecond }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Target className="w-3 h-3 text-yellow-400" />
              </div>
            </div>
          )}

          {/* クリップ表示 */}
          {timeline.clips.map((clip, layerIndex) => {
            const clipX = clip.startTime * pixelsPerSecond;
            const clipWidth = clip.duration * pixelsPerSecond;
            const clipY = headerHeight + layerIndex * (trackHeight + 10);

            return (
              <motion.div
                key={clip.id}
                className={`absolute bg-gradient-to-r from-blue-500 to-blue-600 rounded cursor-move border-2 ${
                  selectedClipId === clip.id
                    ? 'border-purple-400 shadow-lg shadow-purple-400/20'
                    : 'border-blue-400/30 hover:border-blue-400'
                } transition-all`}
                style={{
                  left: clipX,
                  top: clipY,
                  width: Math.max(clipWidth, 50),
                  height: trackHeight,
                }}
                onMouseDown={(e) => handleClipMouseDown(e, clip)}
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
                {beatGrid.enabled && bpmAnalysis && (
                  <div className="absolute top-1 right-1">
                    <Magnet className="w-3 h-3 text-purple-300" />
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* プレイヘッド */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
            style={{ left: playheadPosition * pixelsPerSecond }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="w-3 h-3 bg-red-500 rotate-45" />
            </div>
          </div>

          {/* 時間軸 */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-dark-800 border-b border-dark-700">
            {Array.from({ length: Math.ceil(timeline.duration) + 1 }, (_, i) => (
              <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: i * pixelsPerSecond }}>
                <div className="w-px h-2 bg-gray-600" />
                <span className="ml-1 text-xs text-gray-400 font-mono">
                  {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ヘルプテキスト */}
      <div className="bg-dark-800 border-t border-dark-700 px-4 py-2">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Info className="w-3 h-3" />
          <span>
            {beatGrid.enabled
              ? 'ビートスナップが有効です。クリップを拍に合わせて自動調整します。'
              : 'スナップボタンを押すとビートに合わせて自動配置できます。'}
          </span>
        </div>
      </div>
    </div>
  );
};

function clampTime(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default BeatTimeline;