import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Music,
  Plus,
  ArrowRightLeft,
  Shuffle,
  Volume,
  Activity
} from 'lucide-react';
import type { Timeline as TimelineType, TimelineClip, AudioTrack, Transition } from '@/types';
import WaveformDisplay from '../waveform/WaveformDisplay';

interface TimelineProps {
  timeline: TimelineType;
  playheadPosition: number;
  zoom: number;
  onClipSelect: (clip: TimelineClip) => void;
  onTimelineUpdate: (timeline: TimelineType) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  timeline,
  playheadPosition,
  zoom,
  onClipSelect,
  onTimelineUpdate
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [copiedClip, setCopiedClip] = useState<TimelineClip | null>(null);
  const [isResizing, setIsResizing] = useState<{ clipId: string; edge: 'left' | 'right' } | null>(null);
  const [isAddingTransition, setIsAddingTransition] = useState<boolean>(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Timeline scale (pixels per second)
  const scale = 40 * zoom;
  const trackHeight = 60;
  const audioTrackHeight = 40;

  // クリップ分割機能
  const splitClipAtPlayhead = () => {
    if (!selectedClipId) {
      console.warn('No clip selected for splitting');
      return;
    }

    const selectedClip = timeline.clips.find(clip => clip.id === selectedClipId);
    if (!selectedClip) {
      console.warn('Selected clip not found');
      return;
    }

    // プレイヘッドがクリップの範囲内にあるかチェック
    const clipEndTime = selectedClip.startTime + selectedClip.duration;
    if (playheadPosition <= selectedClip.startTime || playheadPosition >= clipEndTime) {
      console.warn('Playhead is not within the selected clip');
      return;
    }

    // 分割位置を計算
    const splitPosition = playheadPosition - selectedClip.startTime;
    
    // 新しいクリップID生成
    const newClipId = `${selectedClip.id}_split_${Date.now()}`;
    
    // 元のクリップ（左側）
    const leftClip: TimelineClip = {
      ...selectedClip,
      duration: splitPosition,
      trimEnd: selectedClip.trimStart + splitPosition
    };
    
    // 新しいクリップ（右側）
    const rightClip: TimelineClip = {
      ...selectedClip,
      id: newClipId,
      startTime: playheadPosition,
      duration: selectedClip.duration - splitPosition,
      trimStart: selectedClip.trimStart + splitPosition
    };

    // クリップリストを更新
    const updatedClips = timeline.clips.map(clip => 
      clip.id === selectedClipId ? leftClip : clip
    ).concat(rightClip);
    
    const updatedTimeline = {
      ...timeline,
      clips: updatedClips
    };
    
    onTimelineUpdate(updatedTimeline);
    console.log(`✂️ Clip split: ${selectedClip.id} → ${leftClip.id} + ${rightClip.id}`);
  };

  // クリップコピー機能
  const copySelectedClip = () => {
    if (!selectedClipId) {
      console.warn('No clip selected for copying');
      return;
    }

    const selectedClip = timeline.clips.find(clip => clip.id === selectedClipId);
    if (!selectedClip) {
      console.warn('Selected clip not found');
      return;
    }

    setCopiedClip(selectedClip);
    console.log(`📋 Clip copied: ${selectedClip.id}`);
  };

  // クリップペースト機能
  const pasteClip = () => {
    if (!copiedClip) {
      console.warn('No clip in clipboard');
      return;
    }

    // プレイヘッド位置に新しいクリップを配置
    const newClip: TimelineClip = {
      ...copiedClip,
      id: `${copiedClip.id}_copy_${Date.now()}`,
      startTime: playheadPosition,
      layer: 0 // デフォルトで最初のレイヤーに配置
    };

    const updatedTimeline = {
      ...timeline,
      clips: [...timeline.clips, newClip]
    };
    
    onTimelineUpdate(updatedTimeline);
    setSelectedClipId(newClip.id);
    onClipSelect(newClip);
    console.log(`📌 Clip pasted: ${newClip.id} at ${playheadPosition}s`);
  };

  // トランジション追加機能
  const addTransitionBetweenClips = (clipId: string, transitionType: Transition['type'] = 'crossfade') => {
    const clip = timeline.clips.find(c => c.id === clipId);
    if (!clip) return;

    // 同じレイヤーの次のクリップを探す
    const nextClip = timeline.clips
      .filter(c => c.layer === clip.layer && c.startTime > clip.startTime)
      .sort((a, b) => a.startTime - b.startTime)[0];

    if (!nextClip) {
      console.warn('No next clip found for transition');
      return;
    }

    // クリップ間の距離を確認
    const gap = nextClip.startTime - (clip.startTime + clip.duration);
    const transitionDuration = Math.min(1.0, Math.max(0.5, gap)); // 0.5秒から1秒の間

    if (gap < 0.1) {
      console.warn('Clips are too close for transition');
      return;
    }

    const newTransition: Transition = {
      type: transitionType,
      duration: transitionDuration,
      parameters: getDefaultTransitionParameters(transitionType)
    };

    // 現在のクリップのout transitionを追加
    const updatedClips = timeline.clips.map(c => {
      if (c.id === clipId) {
        return {
          ...c,
          transitions: {
            ...c.transitions,
            out: newTransition
          }
        };
      }
      if (c.id === nextClip.id) {
        return {
          ...c,
          transitions: {
            ...c.transitions,
            in: newTransition
          }
        };
      }
      return c;
    });

    const updatedTimeline = {
      ...timeline,
      clips: updatedClips
    };

    onTimelineUpdate(updatedTimeline);
    console.log(`🎬 Transition added: ${clip.id} → ${nextClip.id} (${transitionType})`);
  };

  // トランジション削除機能
  const removeTransition = (clipId: string, direction: 'in' | 'out') => {
    const updatedClips = timeline.clips.map(clip => {
      if (clip.id === clipId) {
        const newTransitions = { ...clip.transitions };
        delete newTransitions[direction];
        return {
          ...clip,
          transitions: Object.keys(newTransitions).length > 0 ? newTransitions : undefined
        };
      }
      return clip;
    });

    const updatedTimeline = {
      ...timeline,
      clips: updatedClips
    };

    onTimelineUpdate(updatedTimeline);
    console.log(`🗑️ Transition removed: ${clipId} (${direction})`);
  };

  // トランジションのデフォルトパラメータ
  const getDefaultTransitionParameters = (type: Transition['type']): Record<string, any> => {
    switch (type) {
      case 'crossfade':
        return { curve: 'ease-in-out' };
      case 'slide':
        return { direction: 'left', easing: 'ease-out' };
      case 'wipe':
        return { direction: 'horizontal', softness: 0.1 };
      case 'cut':
        return {};
      default:
        return {};
    }
  };

  // クリップリサイズ開始
  const handleResizeStart = (clipId: string, edge: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing({ clipId, edge });
  };

  // クリップリサイズ処理
  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const newTime = pixelToTime(mouseX);
    
    const clipToResize = timeline.clips.find(clip => clip.id === isResizing.clipId);
    if (!clipToResize) return;

    let updatedClip: TimelineClip;
    
    if (isResizing.edge === 'left') {
      // 左端をリサイズ：開始時間とトリム開始を変更
      const newStartTime = Math.max(0, Math.min(newTime, clipToResize.startTime + clipToResize.duration - 0.1));
      const timeDiff = newStartTime - clipToResize.startTime;
      
      updatedClip = {
        ...clipToResize,
        startTime: newStartTime,
        duration: clipToResize.duration - timeDiff,
        trimStart: Math.max(0, clipToResize.trimStart + timeDiff)
      };
    } else {
      // 右端をリサイズ：終了時間とトリム終了を変更
      const maxEndTime = clipToResize.trimEnd;
      const newDuration = Math.max(0.1, Math.min(newTime - clipToResize.startTime, maxEndTime - clipToResize.trimStart));
      
      updatedClip = {
        ...clipToResize,
        duration: newDuration,
        trimEnd: clipToResize.trimStart + newDuration
      };
    }
    
    const updatedClips = timeline.clips.map(clip => 
      clip.id === isResizing.clipId ? updatedClip : clip
    );
    
    const updatedTimeline = {
      ...timeline,
      clips: updatedClips
    };
    
    onTimelineUpdate(updatedTimeline);
  };

  // キーボードショートカット
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + C でコピー
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      copySelectedClip();
    }
    // Ctrl/Cmd + V でペースト
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      pasteClip();
    }
    // S で分割
    else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      splitClipAtPlayhead();
    }
    // Delete/Backspace で削除
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedClipId) {
        e.preventDefault();
        handleClipDelete(selectedClipId);
      }
    }
    // T でトランジション追加
    else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      if (selectedClipId) {
        setIsAddingTransition(true);
        addTransitionBetweenClips(selectedClipId, 'crossfade');
        setTimeout(() => setIsAddingTransition(false), 1000);
      }
    }
  };

  // イベントリスナーの追加
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        handleResize(e);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.cursor = '';
    };
  }, [isResizing, selectedClipId, copiedClip, playheadPosition]);

  // Convert time to pixel position
  const timeToPixel = (time: number) => time * scale;
  
  // Convert pixel position to time
  const pixelToTime = (pixel: number) => pixel / scale;

  // 選択されたクリップの取得
  const selectedClip = selectedClipId ? timeline.clips.find(clip => clip.id === selectedClipId) : null;
  const canSplit = selectedClip && 
    playheadPosition > selectedClip.startTime && 
    playheadPosition < selectedClip.startTime + selectedClip.duration;

  // Handle clip drag and drop
  const handleClipDragStart = (e: React.DragEvent, clip: TimelineClip) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'timeline-clip',
      data: clip
    }));
  };

  const handleClipDragEnd = () => {
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleTrackDrop = (e: React.DragEvent, layer: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - rect.left - dragOffset;
    const newStartTime = Math.max(0, pixelToTime(dropX));

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.type === 'media') {
        // Add new clip from media library
        const newClip: TimelineClip = {
          id: `clip-${Date.now()}`,
          mediaId: dragData.data.id,
          startTime: newStartTime,
          duration: dragData.data.duration || 5,
          trimStart: 0,
          trimEnd: dragData.data.duration || 5,
          layer,
          effects: dragData.data.type === 'image' ? [
            {
              id: `effect-${Date.now()}`,
              type: 'pan_zoom',
              parameters: { zoom: 1.1, panX: 0, panY: 0 },
              enabled: true
            }
          ] : undefined
        };
        
        const updatedTimeline = {
          ...timeline,
          clips: [...timeline.clips, newClip]
        };
        onTimelineUpdate(updatedTimeline);
      } else if (dragData.type === 'timeline-clip') {
        // Move existing clip
        const updatedClips = timeline.clips.map(clip =>
          clip.id === dragData.data.id
            ? { ...clip, startTime: newStartTime, layer }
            : clip
        );
        
        const updatedTimeline = {
          ...timeline,
          clips: updatedClips
        };
        onTimelineUpdate(updatedTimeline);
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  };

  const handleClipSelect = (clip: TimelineClip) => {
    setSelectedClipId(clip.id);
    onClipSelect(clip);
  };

  const handleClipDelete = (clipId: string) => {
    const updatedClips = timeline.clips.filter(clip => clip.id !== clipId);
    const updatedTimeline = {
      ...timeline,
      clips: updatedClips
    };
    onTimelineUpdate(updatedTimeline);
    
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = [];
    const maxTime = Math.max(timeline.duration, 60);
    const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : 1;
    
    for (let i = 0; i <= maxTime; i += interval) {
      markers.push(i);
    }
    return markers;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Timeline Header */}
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-white">Timeline</h3>
            {selectedClip && (
              <div className="text-sm text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                {selectedClip.id.slice(-8)} selected
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
              onClick={() => onTimelineUpdate({ ...timeline, zoom: Math.max(0.25, zoom - 0.25) })}
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4 text-dark-400" />
            </button>
            <span className="text-sm text-dark-400 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
              onClick={() => onTimelineUpdate({ ...timeline, zoom: Math.min(4, zoom + 0.25) })}
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          
          {/* キーボードショートカット表示 */}
          <div className="hidden lg:flex items-center space-x-3 text-xs text-gray-400">
            <span>Shortcuts:</span>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 bg-dark-700 rounded">S</kbd>
              <span>Split</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 bg-dark-700 rounded">T</kbd>
              <span>Transition</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 bg-dark-700 rounded">Ctrl+C</kbd>
              <span>Copy</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 bg-dark-700 rounded">Ctrl+V</kbd>
              <span>Paste</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 bg-dark-700 rounded">Del</kbd>
              <span>Delete</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              copiedClip 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-dark-700 hover:bg-dark-600 text-gray-300'
            }`}
            onClick={copySelectedClip}
            disabled={!selectedClipId}
            title="Copy clip (Ctrl+C)"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
            {copiedClip && <span className="ml-1 text-xs bg-white/20 px-1 rounded">1</span>}
          </button>
          
          <button 
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              canSplit 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-dark-700 hover:bg-dark-600 text-gray-400 cursor-not-allowed'
            }`}
            onClick={splitClipAtPlayhead}
            disabled={!canSplit}
            title={canSplit ? "Split clip at playhead (S)" : "Select a clip and position playhead to split"}
          >
            <Scissors className="w-4 h-4" />
            <span>Split</span>
          </button>
          
          <button 
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              copiedClip 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-dark-700 hover:bg-dark-600 text-gray-400 cursor-not-allowed'
            }`}
            onClick={pasteClip}
            disabled={!copiedClip}
            title="Paste clip (Ctrl+V)"
          >
            <Plus className="w-4 h-4" />
            <span>Paste</span>
          </button>
          
          <button 
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedClipId && !isAddingTransition
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : isAddingTransition
                ? 'bg-green-500 text-white' 
                : 'bg-dark-700 hover:bg-dark-600 text-gray-400 cursor-not-allowed'
            }`}
            onClick={() => {
              if (selectedClipId) {
                setIsAddingTransition(true);
                addTransitionBetweenClips(selectedClipId, 'crossfade');
                setTimeout(() => setIsAddingTransition(false), 1000);
              }
            }}
            disabled={!selectedClipId || isAddingTransition}
            title="Add transition to next clip (T)"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isAddingTransition ? 'Added!' : 'Transition'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div className="bg-dark-850 border-b border-dark-700 h-8 relative overflow-hidden">
        <div 
          ref={timelineRef}
          className="h-full relative"
          style={{ width: timeToPixel(Math.max(timeline.duration, 60)) }}
        >
          {generateTimeMarkers().map(time => (
            <div
              key={time}
              className="absolute top-0 h-full flex items-center text-xs text-dark-400"
              style={{ left: timeToPixel(time) }}
            >
              <div className="w-px h-3 bg-dark-600 mr-2" />
              {formatTime(time)}
            </div>
          ))}
          
          {/* Playhead */}
          <motion.div
            ref={playheadRef}
            className="absolute top-0 w-0.5 h-full bg-primary-500 z-10"
            style={{ left: timeToPixel(playheadPosition) }}
            animate={{ left: timeToPixel(playheadPosition) }}
            transition={{ type: "tween", duration: 0.1 }}
          >
            <div className="w-3 h-3 bg-primary-500 rounded-full -ml-1.5 -mt-1" />
          </motion.div>
        </div>
      </div>

      {/* Timeline Tracks */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="relative">
          {/* Video Tracks */}
          {Array.from({ length: 3 }, (_, layerIndex) => (
            <div key={`video-${layerIndex}`} className="flex">
              {/* Track Label */}
              <div className="w-24 bg-dark-800 border-r border-dark-700 flex items-center justify-center text-sm text-dark-400 font-medium"
                   style={{ height: trackHeight }}>
                Video {layerIndex + 1}
              </div>
              
              {/* Track Content */}
              <div
                className="flex-1 relative border-b border-dark-700"
                style={{ 
                  height: trackHeight,
                  width: timeToPixel(Math.max(timeline.duration, 60))
                }}
                onDrop={(e) => handleTrackDrop(e, layerIndex)}
                onDragOver={(e) => e.preventDefault()}
              >
                {/* Track Background */}
                <div className="absolute inset-0 bg-dark-850 hover:bg-dark-800 transition-colors" />
                
                {/* Clips on this layer */}
                <AnimatePresence>
                  {timeline.clips
                    .filter(clip => clip.layer === layerIndex)
                    .map(clip => (
                      <motion.div
                        key={clip.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`absolute timeline-clip group border-2 overflow-hidden ${
                          selectedClipId === clip.id 
                            ? 'ring-2 ring-primary-400 border-primary-300 bg-primary-500/80' 
                            : 'border-gray-600 bg-blue-500/60 hover:bg-blue-500/80'
                        }`}
                        style={{
                          left: timeToPixel(clip.startTime),
                          width: timeToPixel(clip.duration),
                          height: trackHeight - 8,
                          top: 4,
                          borderRadius: '6px'
                        }}
                        draggable
                        onDragStart={(e: any) => handleClipDragStart(e, clip)}
                        onDragEnd={handleClipDragEnd}
                        onClick={() => handleClipSelect(clip)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* 左端リサイズハンドル */}
                        <div
                          className="absolute left-0 top-0 w-2 h-full bg-white/30 hover:bg-white/50 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleResizeStart(clip.id, 'left', e)}
                          title="Resize clip start"
                        />
                        
                        {/* クリップコンテンツ */}
                        <div className="flex items-center justify-between h-full px-3 py-1 relative z-10">
                          <div className="flex flex-col justify-center min-w-0 flex-1">
                            <span className="text-xs font-semibold text-white truncate">
                              Clip {clip.id.slice(-4)}
                            </span>
                            {selectedClipId === clip.id && (
                              <div className="text-xs text-white/80 mt-0.5">
                                {formatTime(clip.startTime)} - {formatTime(clip.startTime + clip.duration)}
                                <span className="ml-2 text-white/60">({formatTime(clip.duration)})</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 削除ボタン */}
                          <button
                            className="p-1 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClipDelete(clip.id);
                            }}
                            title="Delete clip (Delete key)"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                        
                        {/* 右端リサイズハンドル */}
                        <div
                          className="absolute right-0 top-0 w-2 h-full bg-white/30 hover:bg-white/50 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleResizeStart(clip.id, 'right', e)}
                          title="Resize clip end"
                        />
                        
                        {/* トリムインジケーター */}
                        {(clip.trimStart > 0 || clip.trimEnd < (clip.trimEnd || clip.duration)) && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-400/60" title="Trimmed content" />
                        )}
                        
                        {/* トランジションインジケーター */}
                        {clip.transitions?.out && (
                          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 bg-orange-500 rounded-full p-1 z-20">
                            <ArrowRightLeft className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {clip.transitions?.in && (
                          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 bg-orange-500 rounded-full p-1 z-20">
                            <ArrowRightLeft className="w-2 h-2 text-white" />
                          </div>
                        )}
                        
                        {/* 選択インジケーター */}
                        {selectedClipId === clip.id && (
                          <div className="absolute inset-0 border-2 border-yellow-400 rounded-md pointer-events-none animate-pulse" />
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {/* Audio Tracks */}
          {timeline.audioTracks.map((audioTrack, index) => (
            <div key={audioTrack.id} className="flex">
              {/* Track Label */}
              <div className="w-24 bg-dark-800 border-r border-dark-700 flex items-center justify-center text-sm text-dark-400 font-medium"
                   style={{ height: audioTrackHeight }}>
                <Volume2 className="w-4 h-4 mr-1" />
                Audio {index + 1}
              </div>
              
              {/* Track Content */}
              <div
                className="flex-1 relative border-b border-dark-700"
                style={{ 
                  height: audioTrackHeight,
                  width: timeToPixel(Math.max(timeline.duration, 60))
                }}
              >
                <div className="absolute inset-0 bg-dark-850" />
                
                {/* Audio Waveform Display */}
                <div
                  className="absolute"
                  style={{
                    left: timeToPixel(audioTrack.startTime),
                    width: timeToPixel(audioTrack.duration),
                    height: audioTrackHeight - 8,
                    top: 4
                  }}
                >
                  {audioTrack.url ? (
                    <WaveformDisplay
                      audioTrack={audioTrack}
                      width={timeToPixel(audioTrack.duration)}
                      height={audioTrackHeight - 8}
                      startTime={audioTrack.startTime}
                      duration={audioTrack.duration}
                      zoom={zoom}
                      color="#06b6d4"
                      showBeats={true}
                      className="rounded border border-cyan-500/30 bg-cyan-500/10"
                      onWaveformClick={(time) => {
                        // プレイヘッドを波形クリック位置に移動する処理
                        console.log('Waveform clicked at time:', time);
                      }}
                    />
                  ) : (
                    <div className="flex items-center h-full px-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      <Activity className="w-3 h-3 mr-1 text-cyan-400" />
                      <span className="text-xs truncate text-cyan-300">
                        {audioTrack.name || 'Audio Track'}
                      </span>
                      {audioTrack.bpm && (
                        <span className="ml-auto text-xs text-cyan-400">
                          {audioTrack.bpm} BPM
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Beat Markers (if no waveform URL) */}
                {!audioTrack.url && audioTrack.beats && audioTrack.beats.map((beatTime, beatIndex) => (
                  <div
                    key={beatIndex}
                    className="absolute w-px h-full bg-secondary-400 opacity-30"
                    style={{ left: timeToPixel(beatTime) }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Add Track Button */}
          <div className="flex">
            <div className="w-24 bg-dark-800 border-r border-dark-700" />
            <button className="flex-1 h-12 border-b border-dark-700 bg-dark-850 hover:bg-dark-800 transition-colors flex items-center justify-center text-dark-400 text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;