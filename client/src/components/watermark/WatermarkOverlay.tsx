import React from 'react';
import { Sparkles } from 'lucide-react';

interface WatermarkOverlayProps {
  enabled: boolean;
  preset: {
    id: string;
    position: { x: number; y: number };
    size: number;
    opacity: number;
    style: 'minimal' | 'branded' | 'corner' | 'center';
  };
  className?: string;
}

const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  enabled,
  preset,
  className = ''
}) => {
  if (!enabled) return null;

  const getWatermarkStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${preset.position.x}%`,
      top: `${preset.position.y}%`,
      transform: 'translate(-50%, -50%)',
      opacity: preset.opacity / 100,
      fontSize: `${preset.size}px`,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '600',
      color: '#ffffff',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 1000
    };

    switch (preset.style) {
      case 'minimal':
        return {
          ...baseStyle,
          fontSize: `${preset.size}px`,
          fontWeight: '400',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        };
      case 'branded':
        return {
          ...baseStyle,
          fontSize: `${preset.size}px`,
          fontWeight: '700',
          background: 'linear-gradient(45deg, #6366f1, #d946ef)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: 'none',
          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
        };
      case 'corner':
        return {
          ...baseStyle,
          fontSize: `${preset.size}px`,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '4px 8px',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)'
        };
      case 'center':
        return {
          ...baseStyle,
          fontSize: `${preset.size}px`,
          border: '1px solid rgba(255,255,255,0.3)',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      className={`absolute ${className}`}
      style={getWatermarkStyle()}
    >
      <div className="flex items-center space-x-1">
        <Sparkles className="w-4 h-4" />
        <span>FlickMV</span>
      </div>
    </div>
  );
};

export default WatermarkOverlay;
