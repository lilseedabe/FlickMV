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
  Plus
} from 'lucide-react';
import type { Timeline as TimelineType, TimelineClip, AudioTrack } from '@/types';

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
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Timeline scale (pixels per second)
  const scale = 40 * zoom;
  const trackHeight = 60;
  const audioTrackHeight = 40;

  // Convert time to pixel position
  const timeToPixel = (time: number) => time * scale;
  
  // Convert pixel position to time
  const pixelToTime = (pixel: number) => pixel / scale;

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
          <h3 className="text-lg font-semibold text-white">Timeline</h3>
          <div className="flex items-center space-x-2">
            <button
              className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
              onClick={() => onTimelineUpdate({ ...timeline, zoom: Math.max(0.25, zoom - 0.25) })}
            >
              <ZoomOut className="w-4 h-4 text-dark-400" />
            </button>
            <span className="text-sm text-dark-400 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
              onClick={() => onTimelineUpdate({ ...timeline, zoom: Math.min(4, zoom + 0.25) })}
            >
              <ZoomIn className="w-4 h-4 text-dark-400" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="btn-ghost text-sm">
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </button>
          <button className="btn-ghost text-sm">
            <Scissors className="w-4 h-4 mr-1" />
            Split
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
                        className={`absolute timeline-clip ${
                          selectedClipId === clip.id 
                            ? 'ring-2 ring-primary-400' 
                            : ''
                        }`}
                        style={{
                          left: timeToPixel(clip.startTime),
                          width: timeToPixel(clip.duration),
                          height: trackHeight - 8,
                          top: 4
                        }}
                        draggable
                        onDragStart={(e: any) => handleClipDragStart(e, clip)}
                        onDragEnd={handleClipDragEnd}
                        onClick={() => handleClipSelect(clip)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between h-full px-2">
                          <span className="text-xs font-medium truncate">
                            Clip {clip.id.slice(-4)}
                          </span>
                          <button
                            className="p-1 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClipDelete(clip.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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
                
                {/* Audio Waveform Clip */}
                <div
                  className="absolute timeline-audio"
                  style={{
                    left: timeToPixel(audioTrack.startTime),
                    width: timeToPixel(audioTrack.duration),
                    height: audioTrackHeight - 8,
                    top: 4
                  }}
                >
                  <div className="flex items-center h-full px-2">
                    <Music className="w-3 h-3 mr-1" />
                    <span className="text-xs truncate">
                      Audio Track
                    </span>
                    {audioTrack.bpm && (
                      <span className="ml-auto text-xs opacity-70">
                        {audioTrack.bpm} BPM
                      </span>
                    )}
                  </div>
                </div>

                {/* Beat Markers */}
                {audioTrack.beats && audioTrack.beats.map((beatTime, beatIndex) => (
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