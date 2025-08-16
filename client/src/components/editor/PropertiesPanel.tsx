import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Image, 
  Video, 
  Music,
  Sliders,
  Palette,
  Zap,
  Clock,
  RotateCw,
  Move,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import type { TimelineClip, ProjectSettings, ClipEffect, EffectType, Resolution } from '@/types';

interface PropertiesPanelProps {
  selectedClip: TimelineClip | null;
  projectSettings: ProjectSettings;
  onClipUpdate: (clip: TimelineClip) => void;
  onSettingsUpdate: (settings: ProjectSettings) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedClip,
  projectSettings,
  onClipUpdate,
  onSettingsUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'clip' | 'project'>('clip');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'effects', 'transform'])
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const updateClipProperty = (property: string, value: any) => {
    if (!selectedClip) return;
    
    const updatedClip = {
      ...selectedClip,
      [property]: value
    };
    onClipUpdate(updatedClip);
  };

  const updateEffect = (effectId: string, parameters: Record<string, any>) => {
    if (!selectedClip) return;
    
    const updatedEffects = selectedClip.effects?.map(effect =>
      effect.id === effectId 
        ? { ...effect, parameters: { ...effect.parameters, ...parameters } }
        : effect
    ) || [];
    
    updateClipProperty('effects', updatedEffects);
  };

  const addEffect = (type: EffectType) => {
    if (!selectedClip) return;
    
    const newEffect: ClipEffect = {
      id: `effect-${Date.now()}`,
      type,
      parameters: getDefaultParameters(type),
      enabled: true
    };
    
    const updatedEffects = [...(selectedClip.effects || []), newEffect];
    updateClipProperty('effects', updatedEffects);
  };

  const removeEffect = (effectId: string) => {
    if (!selectedClip) return;
    
    const updatedEffects = selectedClip.effects?.filter(effect => effect.id !== effectId) || [];
    updateClipProperty('effects', updatedEffects);
  };

  const toggleEffect = (effectId: string) => {
    if (!selectedClip) return;
    
    const updatedEffects = selectedClip.effects?.map(effect =>
      effect.id === effectId 
        ? { ...effect, enabled: !effect.enabled }
        : effect
    ) || [];
    
    updateClipProperty('effects', updatedEffects);
  };

  const getDefaultParameters = (type: EffectType): Record<string, any> => {
    switch (type) {
      case 'brightness':
        return { value: 0 };
      case 'contrast':
        return { value: 0 };
      case 'saturation':
        return { value: 0 };
      case 'speed':
        return { value: 1 };
      case 'pan_zoom':
        return { zoom: 1.1, panX: 0, panY: 0 };
      case 'fade':
        return { type: 'in', duration: 0.5 };
      default:
        return {};
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${parseFloat(secs).toFixed(1).padStart(4, '0')}`;
  };

  const EffectControl: React.FC<{ effect: ClipEffect }> = ({ effect }) => {
    const renderParameters = () => {
      switch (effect.type) {
        case 'brightness':
        case 'contrast':
        case 'saturation':
          return (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1 capitalize">
                  {effect.type}
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={effect.parameters.value || 0}
                  onChange={(e) => updateEffect(effect.id, { value: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-dark-400 text-center">
                  {effect.parameters.value || 0}%
                </div>
              </div>
            </div>
          );
        
        case 'speed':
          return (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Speed</label>
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.25"
                  value={effect.parameters.value || 1}
                  onChange={(e) => updateEffect(effect.id, { value: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-dark-400 text-center">
                  {effect.parameters.value || 1}x
                </div>
              </div>
            </div>
          );
        
        case 'pan_zoom':
          return (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Zoom</label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.1"
                  value={effect.parameters.zoom || 1}
                  onChange={(e) => updateEffect(effect.id, { zoom: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-dark-400 text-center">
                  {effect.parameters.zoom || 1}x
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Pan X</label>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.1"
                    value={effect.parameters.panX || 0}
                    onChange={(e) => updateEffect(effect.id, { panX: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Pan Y</label>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.1"
                    value={effect.parameters.panY || 0}
                    onChange={(e) => updateEffect(effect.id, { panY: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          );
        
        default:
          return <div className="text-sm text-dark-400">No parameters available</div>;
      }
    };

    return (
      <div className="border border-dark-600 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium capitalize">{effect.type.replace('_', ' ')}</span>
            <button
              onClick={() => toggleEffect(effect.id)}
              className={`p-1 rounded ${effect.enabled ? 'text-green-400' : 'text-dark-400'}`}
            >
              {effect.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => removeEffect(effect.id)}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Remove
          </button>
        </div>
        {effect.enabled && renderParameters()}
      </div>
    );
  };

  const Section: React.FC<{ 
    id: string; 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode 
  }> = ({ id, title, icon, children }) => {
    const isExpanded = expandedSections.has(id);
    
    return (
      <div className="border-b border-dark-700">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-dark-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="flex border-b border-dark-700">
        <button
          onClick={() => setActiveTab('clip')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'clip'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 mr-2 inline" />
          Clip
        </button>
        <button
          onClick={() => setActiveTab('project')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'project'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 mr-2 inline" />
          Project
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'clip' ? (
          selectedClip ? (
            <div>
              <Section id="basic" title="Basic Properties" icon={<Sliders className="w-4 h-4" />}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Duration</label>
                    <input
                      type="number"
                      value={selectedClip.duration}
                      onChange={(e) => updateClipProperty('duration', parseFloat(e.target.value))}
                      className="input"
                      step="0.1"
                      min="0.1"
                    />
                    <div className="text-xs text-dark-400 mt-1">
                      {formatDuration(selectedClip.duration)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Start Time</label>
                    <input
                      type="number"
                      value={selectedClip.startTime}
                      onChange={(e) => updateClipProperty('startTime', parseFloat(e.target.value))}
                      className="input"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Layer</label>
                    <input
                      type="number"
                      value={selectedClip.layer}
                      onChange={(e) => updateClipProperty('layer', parseInt(e.target.value))}
                      className="input"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>
              </Section>

              <Section id="effects" title="Effects" icon={<Zap className="w-4 h-4" />}>
                <div className="space-y-4">
                  {selectedClip.effects && selectedClip.effects.length > 0 ? (
                    <div className="space-y-3">
                      {selectedClip.effects.map(effect => (
                        <EffectControl key={effect.id} effect={effect} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-dark-400 text-sm">
                      No effects applied
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Add Effect</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['brightness', 'contrast', 'saturation', 'speed', 'pan_zoom', 'fade'].map(type => (
                        <button
                          key={type}
                          onClick={() => addEffect(type as EffectType)}
                          className="btn-secondary text-xs capitalize"
                        >
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              <Section id="transform" title="Transform" icon={<Move className="w-4 h-4" />}>
                <div className="space-y-4">
                  <div className="text-sm text-dark-400">
                    Transform controls coming soon...
                  </div>
                </div>
              </Section>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center p-6">
              <div>
                <Layers className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Clip Selected</h3>
                <p className="text-sm text-dark-400">
                  Select a clip from the timeline to edit its properties
                </p>
              </div>
            </div>
          )
        ) : (
          <div>
            <Section id="output" title="Output Settings" icon={<Video className="w-4 h-4" />}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Resolution</label>
                  <select
                    value={projectSettings.resolution}
                    onChange={(e) => onSettingsUpdate({
                      ...projectSettings,
                      resolution: e.target.value as Resolution
                    })}
                    className="input"
                  >
                    <option value="9:16">9:16 (1080×1920) - Vertical</option>
                    <option value="1:1">1:1 (1080×1080) - Square</option>
                    <option value="16:9">16:9 (1920×1080) - Horizontal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Frame Rate</label>
                  <select
                    value={projectSettings.frameRate}
                    onChange={(e) => onSettingsUpdate({
                      ...projectSettings,
                      frameRate: Number(e.target.value) as 24 | 30 | 60
                    })}
                    className="input"
                  >
                    <option value="24">24 fps</option>
                    <option value="30">30 fps</option>
                    <option value="60">60 fps</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Quality</label>
                  <select
                    value={projectSettings.outputFormat.quality}
                    onChange={(e) => onSettingsUpdate({
                      ...projectSettings,
                      outputFormat: {
                        ...projectSettings.outputFormat,
                        quality: e.target.value as 'low' | 'medium' | 'high' | 'ultra'
                      }
                    })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section id="audio" title="Audio Settings" icon={<Music className="w-4 h-4" />}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Audio Bitrate</label>
                  <select
                    value={projectSettings.outputFormat.audioBitrate}
                    onChange={(e) => onSettingsUpdate({
                      ...projectSettings,
                      outputFormat: {
                        ...projectSettings.outputFormat,
                        audioBitrate: parseInt(e.target.value)
                      }
                    })}
                    className="input"
                  >
                    <option value="128">128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="256">256 kbps</option>
                    <option value="320">320 kbps</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section id="export" title="Export" icon={<Settings className="w-4 h-4" />}>
              <div className="space-y-4">
                <button className="btn-primary w-full">
                  Export Video
                </button>
                <div className="text-xs text-dark-400 text-center">
                  Estimated file size: ~25 MB
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;