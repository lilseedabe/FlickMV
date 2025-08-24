import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Move, Eye } from 'lucide-react';
import type { Timeline, TimelineClip, AudioTrack } from '@/types';
import useTimelineScale from '../../hooks/timeline/useTimelineScale';
import useTimelineDrag from '../../hooks/timeline/useTimelineDrag';

export interface DualTimelineProps {
  /** タイムライン全体 */
  timeline: Timeline;
  /** プレイヘッド位置 */
  playheadPosition: number;
  /** メインタイムラインのズーム倍率 */
  mainZoom: number;
  /** メインタイムラインの表示開始時間 */
  viewportStartTime: number;
  /** メインタイムラインの表示時間幅 */
  viewportDuration: number;
  /** プレイヘッド変更コールバック */
  onPlayheadChange?: (time: number) => void;
  /** ビューポート変更コールバック */
  onViewportChange?: (startTime: number, duration: number) => void;
  /** ズーム変更コールバック */
  onZoomChange?: (zoom: number) => void;
  /** クリップ選択コールバック */
  onClipSelect?: (clip: TimelineClip) => void;
  /** クラス名 */
  className?: string;
}

interface ViewportWindow {
  startTime: number;
  duration: number;
  pixelStart: number;
  pixelWidth: number;
}

/**
 * デュアルタイムライン - ミニマップ + 詳細編集
 * 長尺コンテンツのナビゲーションを劇的に改善
 */
const DualTimeline: React.FC<DualTimelineProps> = ({
  timeline,
  playheadPosition,
  mainZoom,
  viewportStartTime,
  viewportDuration,
  onPlayheadChange,
  onViewportChange,
  onZoomChange,
  onClipSelect,
  className = ''
}) => {
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);
  const [isResizingViewport, setIsResizingViewport] = useState<'left' | 'right' | null>(null);
  const [showMiniWaveforms, setShowMiniWaveforms] = useState(true);
  
  const minimapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // ミニマップのレイアウト設定
  const minimapHeight = 120;
  const minimapTrackHeight = 16;
  const minimapAudioHeight = 12;
  const minimapWidth = 800;

  // ミニマップ用スケール: 全体を表示
  const basePixelsPerSecond = 50;
  const minimapPixelsPerSecond = minimapWidth / timeline.duration;
  const minimapTimeToPixel = useCallback((time: number) => time * minimapPixelsPerSecond, [minimapPixelsPerSecond]);

  // ビューポートウィンドウの計算
  const viewportWindow: ViewportWindow = useMemo(() => {
    const startTime = Math.max(0, viewportStartTime);
    const duration = Math.min(viewportDuration, timeline.duration - startTime);
    const pixelStart = minimapTimeToPixel(startTime);
    const pixelWidth = minimapTimeToPixel(duration);

    return {
      startTime,
      duration,
      pixelStart,
      pixelWidth: Math.max(20, pixelWidth) // 最小幅20px
    };
  }, [viewportStartTime, viewportDuration, timeline.duration, minimapTimeToPixel]);

  // ビューポートドラッグ処理
  const registerViewportDrag = useCallback((element: HTMLElement) => {
    let isDragging = false;
    let startX = 0;
    let startPixelStart = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      startX = e.clientX;
      startPixelStart = viewportWindow.pixelStart;
      setIsDraggingViewport(true);
      
      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDragging || !minimapRef.current) return;

        const deltaX = moveEvent.clientX - startX;
        const newPixelStart = Math.max(0, Math.min(
          minimapWidth - viewportWindow.pixelWidth,
          startPixelStart + deltaX
        ));
        
        const newStartTime = newPixelStart / minimapPixelsPerSecond;
        onViewportChange?.(newStartTime, viewportWindow.duration);
      };

      const handlePointerUp = () => {
        isDragging = false;
        setIsDraggingViewport(false);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    };

    element.addEventListener('pointerdown', handlePointerDown);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [viewportWindow, minimapPixelsPerSecond, onViewportChange]);

  // ミニマップクリック処理
  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    if (!minimapRef.current || isDraggingViewport) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = clickX / minimapPixelsPerSecond;

    // プレイヘッド移動
    if (e.shiftKey) {
      onPlayheadChange?.(Math.max(0, Math.min(clickTime, timeline.duration)));
    } else {
      // ビューポート中央を移動
      const newStartTime = Math.max(0, Math.min(
        timeline.duration - viewportWindow.duration,
        clickTime - viewportWindow.duration / 2
      ));
      onViewportChange?.(newStartTime, viewportWindow.duration);
    }
  }, [minimapPixelsPerSecond, timeline.duration, viewportWindow.duration, isDraggingViewport, onPlayheadChange, onViewportChange]);

  // ビューポートリサイズ処理
  const handleViewportResize = useCallback((e: React.PointerEvent, edge: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizingViewport(edge);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const currentX = moveEvent.clientX - rect.left;
      const currentTime = currentX / minimapPixelsPerSecond;

      let newStartTime = viewportWindow.startTime;
      let newDuration = viewportWindow.duration;

      if (edge === 'left') {
        newStartTime = Math.max(0, Math.min(currentTime, viewportWindow.startTime + viewportWindow.duration - 1));
        newDuration = viewportWindow.startTime + viewportWindow.duration - newStartTime;
      } else {
        const newEndTime = Math.max(viewportWindow.startTime + 1, Math.min(currentTime, timeline.duration));
        newDuration = newEndTime - viewportWindow.startTime;
      }

      onViewportChange?.(newStartTime, newDuration);
    };

    const handlePointerUp = () => {
      setIsResizingViewport(null);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [minimapPixelsPerSecond, timeline.duration, viewportWindow, onViewportChange]);

  // ズーム操作
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    const zoomFactor = direction === 'in' ? 1.5 : 1 / 1.5;
    const newZoom = Math.max(0.1, Math.min(10, mainZoom * zoomFactor));
    onZoomChange?.(newZoom);
  }, [mainZoom, onZoomChange]);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== document.body && !(e.target as HTMLElement).closest('.dual-timeline')) return;

    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault();
        handleZoom('in');
        break;
      case '-':
        e.preventDefault();
        handleZoom('out');
        break;
      case 'Home':
        e.preventDefault();
        onViewportChange?.(0, viewportWindow.duration);
        break;
      case 'End':
        e.preventDefault();
        onViewportChange?.(Math.max(0, timeline.duration - viewportWindow.duration), viewportWindow.duration);
        break;
    }
  }, [handleZoom, onViewportChange, viewportWindow.duration, timeline.duration]);

  // キーボードイベント登録
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ビューポート要素の登録
  useEffect(() => {
    if (viewportRef.current) {
      const cleanup = registerViewportDrag(viewportRef.current);
      return cleanup;
    }
  }, [registerViewportDrag]);

  return (
    <div className={`dual-timeline bg-gray-900 border border-gray-700 rounded-lg ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Navigator</span>
          </div>
          
          <div className="text-xs text-gray-400">
            {timeline.duration.toFixed(1)}s • {timeline.clips.length} clips
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 波形表示切り替え */}
          <button
            onClick={() => setShowMiniWaveforms(!showMiniWaveforms)}
            className={`p-1 rounded transition-colors ${
              showMiniWaveforms ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Toggle waveforms"
          >
            <Move className="w-3 h-3" />
          </button>

          {/* ズームコントロール */}
          <button
            onClick={() => handleZoom('out')}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          
          <span className="text-xs text-gray-400 min-w-[50px] text-center">
            {Math.round(mainZoom * 100)}%
          </span>
          
          <button
            onClick={() => handleZoom('in')}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ミニマップ */}
      <div className="p-3">
        <div
          ref={minimapRef}
          className="relative bg-gray-850 border border-gray-600 rounded cursor-pointer"
          style={{ width: minimapWidth, height: minimapHeight }}
          onClick={handleMinimapClick}
        >
          {/* 時間軸 */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 border-b border-gray-600 flex items-center">
            {Array.from({ length: Math.ceil(timeline.duration / 10) + 1 }, (_, i) => i * 10).map(time => (
              <div
                key={time}
                className="absolute text-xs text-gray-400"
                style={{ left: minimapTimeToPixel(time) }}
              >
                <div className="w-px h-2 bg-gray-600 mb-1" />
                {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* ビデオクリップ */}
          <div className="absolute top-6 left-0 right-0" style={{ height: minimapTrackHeight * 3 }}>
            {timeline.clips.map((clip) => (
              <div
                key={clip.id}
                className="absolute bg-blue-500/60 hover:bg-blue-500/80 border border-blue-400/30 rounded-sm cursor-pointer transition-colors"
                style={{
                  left: minimapTimeToPixel(clip.startTime),
                  width: Math.max(2, minimapTimeToPixel(clip.duration)),
                  top: clip.layer * minimapTrackHeight,
                  height: minimapTrackHeight - 1
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClipSelect?.(clip);
                }}
                title={`Clip ${clip.id.slice(-4)} - ${clip.duration.toFixed(1)}s`}
              />
            ))}
          </div>

          {/* オーディオトラック */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: minimapAudioHeight * timeline.audioTracks.length }}>
            {timeline.audioTracks.map((track, index) => (
              <div
                key={track.id}
                className="absolute"
                style={{
                  left: minimapTimeToPixel(track.startTime),
                  width: Math.max(2, minimapTimeToPixel(track.duration)),
                  bottom: index * minimapAudioHeight,
                  height: minimapAudioHeight - 1
                }}
              >
                {showMiniWaveforms ? (
                  <div className="h-full bg-cyan-500/40 border border-cyan-400/30 rounded-sm">
                    {/* 簡易波形表示 */}
                    <div className="h-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/40 rounded-sm" />
                  </div>
                ) : (
                  <div className="h-full bg-cyan-500/60 border border-cyan-400/30 rounded-sm" />
                )}
              </div>
            ))}
          </div>

          {/* プレイヘッド */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
            style={{ left: minimapTimeToPixel(playheadPosition) }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2">
              <div className="w-2 h-2 bg-red-500 rotate-45" />
            </div>
          </div>

          {/* ビューポートウィンドウ */}
          <motion.div
            ref={viewportRef}
            className={`absolute top-6 border-2 border-yellow-400 bg-yellow-400/10 cursor-move ${
              isDraggingViewport ? 'bg-yellow-400/20' : ''
            }`}
            style={{
              left: viewportWindow.pixelStart,
              width: viewportWindow.pixelWidth,
              height: minimapHeight - 24 // 時間軸分を除く
            }}
            animate={{
              left: viewportWindow.pixelStart,
              width: viewportWindow.pixelWidth
            }}
            transition={{ type: "tween", duration: 0.1 }}
          >
            {/* リサイズハンドル（左） */}
            <div
              className="absolute left-0 top-0 w-1 h-full bg-yellow-400 cursor-ew-resize hover:bg-yellow-300 transition-colors"
              onPointerDown={(e) => handleViewportResize(e, 'left')}
            />
            
            {/* リサイズハンドル（右） */}
            <div
              className="absolute right-0 top-0 w-1 h-full bg-yellow-400 cursor-ew-resize hover:bg-yellow-300 transition-colors"
              onPointerDown={(e) => handleViewportResize(e, 'right')}
            />

            {/* ビューポート情報 */}
            <div className="absolute top-1 left-1 text-xs text-yellow-200 font-mono">
              {viewportWindow.startTime.toFixed(1)}s
            </div>
            <div className="absolute top-1 right-1 text-xs text-yellow-200 font-mono">
              {(viewportWindow.startTime + viewportWindow.duration).toFixed(1)}s
            </div>
          </motion.div>
        </div>

        {/* 操作ヒント */}
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>Click: Move viewport</span>
            <span>Shift+Click: Move playhead</span>
            <span>Drag edges: Resize viewport</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Home/End: Navigate</span>
            <span>+/- : Zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualTimeline;
