import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Settings,
  Smartphone,
  Tablet,
  Monitor,
  Square
} from 'lucide-react';
import type { Project } from '../../types';
import { RESOLUTION_PRESETS } from '../../types';

interface PreviewProps {
  project: Project;
  playheadPosition: number;
  isPlaying: boolean;
}

const Preview: React.FC<PreviewProps> = ({ 
  project, 
  playheadPosition, 
  isPlaying 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [deviceFrame, setDeviceFrame] = useState<'none' | 'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewQuality, setPreviewQuality] = useState<'low' | 'medium' | 'high'>('medium');

  // Get resolution data
  const resolution = RESOLUTION_PRESETS[project.settings.resolution];

  // Calculate preview size maintaining aspect ratio
  const calculatePreviewSize = () => {
    if (!containerRef.current) return { width: 300, height: 300 };
    
    const container = containerRef.current.getBoundingClientRect();
    const maxWidth = Math.min(container.width - 40, 600);
    const maxHeight = Math.min(container.height - 80, 400);
    
    const aspectRatio = resolution.width / resolution.height;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width, height };
  };

  const { width: previewWidth, height: previewHeight } = calculatePreviewSize();

  // Render current frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = resolution.width;
    canvas.height = resolution.height;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find active clips at current time
    const activeClips = project.timeline.clips.filter(clip => 
      playheadPosition >= clip.startTime && 
      playheadPosition < clip.startTime + clip.duration
    );

    // Sort clips by layer (bottom to top)
    activeClips.sort((a, b) => a.layer - b.layer);

    // Render clips
    activeClips.forEach(clip => {
      const mediaFile = project.mediaLibrary.find(m => m.id === clip.mediaId);
      if (!mediaFile) return;

      // Calculate clip progress (0-1)
      const clipProgress = (playheadPosition - clip.startTime) / clip.duration;
      
      if (mediaFile.type === 'image') {
        renderImageClip(ctx, mediaFile, clip, clipProgress);
      } else if (mediaFile.type === 'video') {
        renderVideoClip(ctx, mediaFile, clip, clipProgress);
      }
    });

    // Add text overlays if any
    renderTextOverlays(ctx);

  }, [playheadPosition, project, resolution]);

  const renderImageClip = (
    ctx: CanvasRenderingContext2D, 
    mediaFile: any, 
    clip: any, 
    progress: number
  ) => {
    // For now, just fill with a color representing the image
    // In a real app, you'd load and draw the actual image
    const img = new Image();
    img.onload = () => {
      // Apply Ken Burns effect if enabled
      const panZoomEffect = clip.effects?.find((e: any) => e.type === 'pan_zoom');
      if (panZoomEffect && panZoomEffect.enabled) {
        const { zoom = 1.1, panX = 0, panY = 0 } = panZoomEffect.parameters;
        const currentZoom = 1 + (zoom - 1) * progress;
        const currentPanX = panX * progress * ctx.canvas.width;
        const currentPanY = panY * progress * ctx.canvas.height;
        
        ctx.save();
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(currentPanX, currentPanY);
        ctx.drawImage(img, 0, 0, ctx.canvas.width / currentZoom, ctx.canvas.height / currentZoom);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    };
    
    // For demo purposes, use a solid color
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    const colorIndex = parseInt(clip.id.slice(-1)) % colors.length;
    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const renderVideoClip = (
    ctx: CanvasRenderingContext2D, 
    mediaFile: any, 
    clip: any, 
    progress: number
  ) => {
    // For demo purposes, render a gradient
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Add some animated elements to show video progress
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const barWidth = ctx.canvas.width * progress;
    ctx.fillRect(0, ctx.canvas.height - 10, barWidth, 10);
  };

  const renderTextOverlays = (ctx: CanvasRenderingContext2D) => {
    // Render any text overlays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FlickMV Preview', ctx.canvas.width / 2, 50);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getDeviceFrameStyle = () => {
    switch (deviceFrame) {
      case 'mobile':
        return {
          padding: '20px 8px',
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          borderRadius: '25px',
          border: '2px solid #333'
        };
      case 'tablet':
        return {
          padding: '30px 20px',
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          borderRadius: '20px',
          border: '2px solid #333'
        };
      case 'desktop':
        return {
          padding: '40px 20px 60px 20px',
          background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
          borderRadius: '10px',
          border: '2px solid #333'
        };
      default:
        return {};
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative h-full flex items-center justify-center ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'bg-dark-850'
      }`}
    >
      {/* Preview Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
        <div className="flex items-center space-x-1 bg-black/50 rounded-lg p-1">
          <button
            className={`p-2 rounded ${deviceFrame === 'none' ? 'bg-primary-500' : 'hover:bg-white/10'}`}
            onClick={() => setDeviceFrame('none')}
            title="No Frame"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded ${deviceFrame === 'mobile' ? 'bg-primary-500' : 'hover:bg-white/10'}`}
            onClick={() => setDeviceFrame('mobile')}
            title="Mobile Frame"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded ${deviceFrame === 'tablet' ? 'bg-primary-500' : 'hover:bg-white/10'}`}
            onClick={() => setDeviceFrame('tablet')}
            title="Tablet Frame"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded ${deviceFrame === 'desktop' ? 'bg-primary-500' : 'hover:bg-white/10'}`}
            onClick={() => setDeviceFrame('desktop')}
            title="Desktop Frame"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
        
        <button
          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
          onClick={() => setShowSafeArea(!showSafeArea)}
          title="Toggle Safe Area"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        <button
          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Preview Info */}
      <div className="absolute top-4 left-4 bg-black/50 rounded-lg p-3 text-sm text-white z-10">
        <div className="space-y-1">
          <div>{resolution.width}×{resolution.height}</div>
          <div>{project.settings.frameRate}fps</div>
          <div>{Math.floor(playheadPosition / 60)}:{(playheadPosition % 60).toFixed(1).padStart(4, '0')}</div>
        </div>
      </div>

      {/* Device Frame */}
      <motion.div
        layout
        className="relative"
        style={getDeviceFrameStyle()}
        animate={{
          scale: isFullscreen ? 1 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Canvas Container */}
        <div 
          className="relative overflow-hidden rounded-lg"
          style={{
            width: previewWidth,
            height: previewHeight,
            backgroundColor: '#000'
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            style={{
              imageRendering: previewQuality === 'low' ? 'pixelated' : 'auto'
            }}
          />

          {/* Safe Area Overlay */}
          {showSafeArea && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Title Safe Area (90%) */}
              <div 
                className="absolute border border-yellow-400/30"
                style={{
                  top: '5%',
                  left: '5%',
                  right: '5%',
                  bottom: '5%'
                }}
              />
              {/* Action Safe Area (95%) */}
              <div 
                className="absolute border border-red-400/30"
                style={{
                  top: '2.5%',
                  left: '2.5%',
                  right: '2.5%',
                  bottom: '2.5%'
                }}
              />
              
              {/* Center Lines */}
              <div className="absolute w-full h-px bg-white/20 top-1/2 transform -translate-y-1/2" />
              <div className="absolute h-full w-px bg-white/20 left-1/2 transform -translate-x-1/2" />
            </div>
          )}

          {/* Loading Overlay */}
          {isPlaying && (
            <div className="absolute bottom-4 left-4 bg-black/70 rounded px-2 py-1 text-xs text-white">
              ● REC
            </div>
          )}
        </div>
      </motion.div>

      {/* Quality Selector */}
      <div className="absolute bottom-4 right-4 bg-black/50 rounded-lg p-2 z-10">
        <select
          value={previewQuality}
          onChange={(e) => setPreviewQuality(e.target.value as 'low' | 'medium' | 'high')}
          className="bg-transparent text-white text-sm focus:outline-none"
        >
          <option value="low">Low Quality</option>
          <option value="medium">Medium Quality</option>
          <option value="high">High Quality</option>
        </select>
      </div>

      {/* Fullscreen Background */}
      {isFullscreen && (
        <div className="absolute inset-0 bg-black -z-10" />
      )}
    </div>
  );
};

export default Preview;