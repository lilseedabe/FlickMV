import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Square
} from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onTimeChange
}) => {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click/drag
  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = Math.max(0, Math.min(duration, percentage * duration));
    
    onTimeChange(newTime);
  };

  const handleProgressDrag = (e: React.MouseEvent) => {
    if (!isDragging || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const dragX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, dragX / rect.width));
    const newTime = percentage * duration;
    
    onTimeChange(newTime);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleProgressDrag(e as any);
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  // Skip functions
  const skipBackward = () => {
    onTimeChange(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    onTimeChange(Math.min(duration, currentTime + 10));
  };

  const stop = () => {
    onTimeChange(0);
  };

  // Volume controls
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  // Progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-6 px-6 py-4 bg-dark-800">
      {/* Transport Controls */}
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={skipBackward}
          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
          title="Skip back 10s"
        >
          <SkipBack className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPlayPause}
          className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={stop}
          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
          title="Stop"
        >
          <Square className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={skipForward}
          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
          title="Skip forward 10s"
        >
          <SkipForward className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Time Display */}
      <div className="text-sm text-dark-300 font-mono min-w-[120px]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Progress Bar */}
      <div className="flex-1 max-w-2xl">
        <div
          ref={progressRef}
          className="relative h-6 flex items-center cursor-pointer group"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
        >
          {/* Background Track */}
          <div className="w-full h-1 bg-dark-600 rounded-full">
            {/* Progress Fill */}
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full relative"
              style={{ width: `${progressPercentage}%` }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ type: "tween", duration: isDragging ? 0 : 0.1 }}
            >
              {/* Playhead */}
              <div className="absolute -right-1.5 -top-1.5 w-4 h-4 bg-primary-400 rounded-full border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Volume Controls */}
      <div className="flex items-center space-x-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </motion.button>

        <div className="relative w-20 group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-1 bg-dark-600 rounded-full appearance-none cursor-pointer slider"
          />
          <style>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              height: 16px;
              width: 16px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .slider::-moz-range-thumb {
              height: 16px;
              width: 16px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
          `}</style>
        </div>

        <span className="text-xs text-dark-400 min-w-[30px] text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Additional Controls */}
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 rounded-lg transition-colors ${
            isLooping 
              ? 'bg-primary-600 text-white' 
              : 'hover:bg-dark-600 text-dark-400'
          }`}
          title="Loop"
        >
          <Repeat className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-dark-400"
          title="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Playback Speed */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-dark-400">Speed:</span>
        <select 
          className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-white focus:border-primary-500"
          defaultValue="1"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
    </div>
  );
};

export default PlaybackControls;