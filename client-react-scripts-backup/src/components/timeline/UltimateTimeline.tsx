import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Settings, 
  Eye,
  Zap,
  Activity,
  Clock,
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Archive,
  GitBranch,
  Monitor
} from 'lucide-react';

import type { Timeline, TimelineClip, BPMAnalysis, BeatGrid } from '@/types';

// 新しいフック群をインポート
import {
  useTimelineScale,
  useTimelineSnap,
  useTimelineDrag,
  useSnapControl,
  useTrackManager,
  useTimelineVirtualization,
  useWaveformCache,
  useUndoRedo,
  useTimelineAccessibility,
  useAudition,
  usePerformanceMonitor
} from '../../hooks/timeline';

// 既存コンポーネント
import BeatTimeline from './BeatTimeline';
import DualTimeline from './DualTimeline';
import EnhancedAudioTimeline from './EnhancedAudioTimeline';

export interface UltimateTimelineProps {
  /** 初期タイムライン */
  timeline: Timeline;
  /** プレイヘッド位置 */
  playheadPosition: number;
  /** ズーム倍率 */
  zoom: number;
  /** BPM解析結果 */
  bpmAnalysis?: BPMAnalysis;
  /** ビートグリッド設定 */
  beatGrid?: BeatGrid;
  /** タイムライン更新コールバック */
  onTimelineUpdate: (timeline: Timeline) => void;
  /** プレイヘッド変更コールバック */
  onPlayheadChange?: (position: number) => void;
  /** ズーム変更コールバック */
  onZoomChange?: (zoom: number) => void;
  /** クリップ選択コールバック */
  onClipSelect?: (clip: TimelineClip) => void;
  /** ビートグリッド変更コールバック */
  onBeatGridChange?: (beatGrid: BeatGrid) => void;
  /** 高度な機能を有効にするか */
  enableAdvancedFeatures?: boolean;
  /** デバッグモード */
  debug?: boolean;
  /** クラス名 */
  className?: string;
}

/**
 * 究極のタイムライン - 全機能統合版
 * すべての新機能を統合した最高性能のタイムラインコンポーネント
 */
const UltimateTimeline: React.FC<UltimateTimelineProps> = ({
  timeline,
  playheadPosition,
  zoom,
  bpmAnalysis,
  beatGrid = {
    enabled: true,
    snapToBeat: true,
    snapToBar: false,
    subdivisions: 4,
    quantizeStrength: 0.7
  },
  onTimelineUpdate,
  onPlayheadChange,
  onZoomChange,
  onClipSelect,
  onBeatGridChange,
  enableAdvancedFeatures = true,
  debug = false,
  className = ''
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'dual' | 'audio-focus'>('standard');
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [showAuditionPanel, setShowAuditionPanel] = useState(false);
  const [viewportStartTime, setViewportStartTime] = useState(0);
  const [viewportDuration, setViewportDuration] = useState(30);

  const containerRef = useRef<HTMLDivElement>(null);

  // ========== フック群の初期化 ==========

  // 1. スケール管理
  const { pixelsPerSecond, timeToPixel, pixelToTime } = useTimelineScale({
    zoom,
    basePixelsPerSecond: 50
  });

  // 2. スナップ制御
  const {
    beatGrid: effectiveBeatGrid,
    magneticMode,
    isSnapEnabled,
    updateBeatGrid,
    toggleMagneticMode,
    statusText
  } = useSnapControl({
    initialBeatGrid: beatGrid,
    onBeatGridChange: onBeatGridChange || (() => {}),
    enableShortcuts: true
  });

  // 3. スナップ計算
  const {
    snapPoints,
    findNearestSnapPoint,
    getSnapPreview
  } = useTimelineSnap({
    enabled: isSnapEnabled,
    bpmAnalysis,
    beatGrid: effectiveBeatGrid,
    pixelsPerSecond,
    timelineDuration: timeline.duration
  });

  // 4. トラック管理
  const {
    trackStates,
    setTrackHeight,
    toggleCollapse,
    toggleMute,
    toggleSolo,
    setViewMode: setTrackViewMode
  } = useTrackManager({
    timeline,
    onTimelineUpdate
  });

  // 5. 仮想化
  const {
    verticalRange,
    horizontalRange,
    isClipVisible,
    getVisibleClips,
    stats: virtualizationStats
  } = useTimelineVirtualization({
    containerWidth: 800,
    containerHeight: 400,
    trackHeight: 80,
    totalTracks: Math.max(3, timeline.clips.reduce((max, clip) => Math.max(max, clip.layer + 1), 0)),
    pixelsPerSecond,
    timelineDuration: timeline.duration,
    scrollTop: 0,
    scrollLeft: timeToPixel(viewportStartTime)
  });

  // 6. 波形キャッシュ
  const {
    getWaveform,
    cacheStats,
    clearCache: clearWaveformCache
  } = useWaveformCache({
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    debug
  });

  // 7. Undo/Redo
  const {
    state: undoRedoState,
    executeAction,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryStats
  } = useUndoRedo(timeline, {
    maxHistorySize: 50,
    debug
  });

  // 8. アクセシビリティ
  const {
    registerFocusableElement,
    focusElement,
    announceToScreenReader
  } = useTimelineAccessibility({
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    debug
  });

  // 9. オーディション（A/B比較）
  const {
    versions: auditionVersions,
    activeVersion,
    comparison,
    saveCurrentAsVersion,
    startComparison,
    switchToVersion,
    previewVersion,
    currentTimeline: auditionTimeline
  } = useAudition(timeline, {
    maxVersions: 10,
    enableAutoSave: true,
    debug
  });

  // 10. パフォーマンス監視
  const {
    currentMetrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getPerformanceStats,
    getOptimizationSuggestions,
    isPerformanceGood,
    alerts
  } = usePerformanceMonitor({
    measurementInterval: 1000,
    enableWarnings: true,
    enableDebugLogs: debug
  });

  // ========== イベントハンドラー ==========

  const handleTimelineUpdate = useCallback((newTimeline: Timeline) => {
    // Undo/Redo履歴に追加
    executeAction('timeline_property_change', 'Timeline updated', newTimeline);
    onTimelineUpdate(newTimeline);
  }, [executeAction, onTimelineUpdate]);

  const handleClipSelect = useCallback((clip: TimelineClip) => {
    setSelectedClipId(clip.id);
    onClipSelect?.(clip);
    announceToScreenReader(`Selected clip: ${clip.id}`);
  }, [onClipSelect, announceToScreenReader]);

  const handleViewportChange = useCallback((startTime: number, duration: number) => {
    setViewportStartTime(startTime);
    setViewportDuration(duration);
  }, []);

  // ========== パフォーマンス監視の開始 ==========
  useEffect(() => {
    if (enableAdvancedFeatures) {
      startMonitoring();
    }
    return () => stopMonitoring();
  }, [enableAdvancedFeatures, startMonitoring, stopMonitoring]);

  // ========== レンダリング ==========

  const performanceIndicator = (
    <div className={`flex items-center space-x-1 text-xs ${
      isPerformanceGood ? 'text-green-400' : 'text-yellow-400'
    }`}>
      {isPerformanceGood ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      <span>{Math.round(currentMetrics.fps)}fps</span>
      <span>{currentMetrics.memoryUsage}MB</span>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className={`ultimate-timeline bg-dark-900 border border-dark-700 rounded-lg overflow-hidden ${className}`}
    >
      {/* ========== ヘッダー ========== */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Ultimate Timeline</h2>
            {magneticMode && (
              <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Magnetic</span>
              </div>
            )}
          </div>

          {/* 統計情報 */}
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>{timeline.clips.length} clips</span>
            <span>{timeline.audioTracks.length} audio</span>
            <span>{Math.floor(timeline.duration / 60)}:{(timeline.duration % 60).toFixed(0).padStart(2, '0')}</span>
            {enableAdvancedFeatures && performanceIndicator}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RefreshCw className="w-4 h-4 transform scale-x-[-1]" />
          </button>
          
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* 表示モード切り替え */}
          <div className="flex bg-dark-700 rounded">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1 text-xs rounded-l ${
                viewMode === 'standard' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setViewMode('dual')}
              className={`px-3 py-1 text-xs ${
                viewMode === 'dual' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Dual
            </button>
            <button
              onClick={() => setViewMode('audio-focus')}
              className={`px-3 py-1 text-xs rounded-r ${
                viewMode === 'audio-focus' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Audio
            </button>
          </div>

          {/* 高度な機能パネル */}
          {enableAdvancedFeatures && (
            <>
              <button
                onClick={() => setShowAuditionPanel(!showAuditionPanel)}
                className={`p-2 rounded transition-colors ${
                  showAuditionPanel ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Audition & Versions"
              >
                <GitBranch className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowPerformancePanel(!showPerformancePanel)}
                className={`p-2 rounded transition-colors ${
                  showPerformancePanel ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Performance Monitor"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========== サイドパネル ========== */}
      <div className="flex">
        <div className="flex-1">
          {/* デュアルタイムライン */}
          {viewMode === 'dual' && (
            <DualTimeline
              timeline={auditionTimeline}
              playheadPosition={playheadPosition}
              mainZoom={zoom}
              viewportStartTime={viewportStartTime}
              viewportDuration={viewportDuration}
              onPlayheadChange={onPlayheadChange}
              onViewportChange={handleViewportChange}
              onZoomChange={onZoomChange}
              onClipSelect={handleClipSelect}
              className="border-b border-dark-700"
            />
          )}

          {/* メインタイムライン */}
          {viewMode === 'standard' || viewMode === 'dual' ? (
            <BeatTimeline
              timeline={auditionTimeline}
              playheadPosition={playheadPosition}
              zoom={zoom}
              onClipSelect={handleClipSelect}
              onTimelineUpdate={handleTimelineUpdate}
              onPlayheadChange={onPlayheadChange}
              bpmAnalysis={bpmAnalysis}
              beatGrid={effectiveBeatGrid}
              onBeatGridChange={updateBeatGrid}
              showBeatMarkers={true}
              showBarMarkers={true}
            />
          ) : (
            <EnhancedAudioTimeline
              timeline={auditionTimeline}
              onTimelineUpdate={handleTimelineUpdate}
              playheadPosition={playheadPosition}
              zoom={zoom}
            />
          )}
        </div>

        {/* ========== 高度な機能パネル ========== */}
        <AnimatePresence>
          {(showAuditionPanel || showPerformancePanel) && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 320 }}
              exit={{ width: 0 }}
              className="border-l border-dark-700 bg-dark-850 overflow-hidden"
            >
              {/* オーディションパネル */}
              {showAuditionPanel && (
                <div className="p-4 border-b border-dark-700">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                    <GitBranch className="w-4 h-4" />
                    <span>Versions & Audition</span>
                  </h3>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => saveCurrentAsVersion(auditionTimeline)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      Save Current Version
                    </button>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {auditionVersions.map(version => (
                        <div
                          key={version.id}
                          className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                            activeVersion?.id === version.id
                              ? 'bg-blue-500/20 border border-blue-500/30'
                              : 'hover:bg-dark-700'
                          }`}
                          onClick={() => {
                            const newTimeline = switchToVersion(version.id);
                            if (newTimeline) handleTimelineUpdate(newTimeline);
                          }}
                        >
                          <div className="font-medium text-white">{version.name}</div>
                          <div className="text-gray-400">
                            {new Date(version.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* パフォーマンスパネル */}
              {showPerformancePanel && (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Performance Monitor</span>
                  </h3>

                  <div className="space-y-3">
                    {/* メトリクス */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-dark-700 p-2 rounded">
                        <div className="text-gray-400">FPS</div>
                        <div className="text-white font-mono">{Math.round(currentMetrics.fps)}</div>
                      </div>
                      <div className="bg-dark-700 p-2 rounded">
                        <div className="text-gray-400">Memory</div>
                        <div className="text-white font-mono">{currentMetrics.memoryUsage}MB</div>
                      </div>
                      <div className="bg-dark-700 p-2 rounded">
                        <div className="text-gray-400">DOM</div>
                        <div className="text-white font-mono">{currentMetrics.domNodes}</div>
                      </div>
                      <div className="bg-dark-700 p-2 rounded">
                        <div className="text-gray-400">Cache</div>
                        <div className="text-white font-mono">{Math.round(cacheStats.hitRate * 100)}%</div>
                      </div>
                    </div>

                    {/* アラート */}
                    {alerts.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {alerts.slice(-3).map((alert, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded text-xs ${
                              alert.severity === 'high' 
                                ? 'bg-red-500/20 border border-red-500/30' 
                                : 'bg-yellow-500/20 border border-yellow-500/30'
                            }`}
                          >
                            <div className="text-white font-medium">{alert.type.toUpperCase()}</div>
                            <div className="text-gray-300">{alert.message}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 最適化提案 */}
                    <div className="text-xs">
                      <div className="text-gray-400 mb-1">Optimization Tips:</div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {getOptimizationSuggestions().slice(0, 3).map((suggestion, index) => (
                          <div key={index} className="text-gray-300">• {suggestion}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========== ステータスバー ========== */}
      <div className="flex items-center justify-between p-2 border-t border-dark-700 bg-dark-850 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{statusText}</span>
          <span>Scale: {Math.round(pixelsPerSecond)}px/s</span>
          {enableAdvancedFeatures && (
            <span>Visible: {getVisibleClips(timeline.clips).length}/{timeline.clips.length} clips</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {enableAdvancedFeatures && (
            <>
              <span>History: {getHistoryStats().totalActions} actions</span>
              <span>Cache: {cacheStats.itemCount} items</span>
            </>
          )}
          <span>{virtualizationStats.renderingEfficiency} efficient</span>
        </div>
      </div>
    </div>
  );
};

export default UltimateTimeline;
