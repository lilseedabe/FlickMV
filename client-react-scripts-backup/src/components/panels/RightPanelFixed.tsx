import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Music,
  Sparkles,
  Monitor,
  Smartphone,
  Tablet,
  Square,
  ExternalLink,
  X,
  Info,
  Zap,
  BarChart3,
  Activity,
  Upload,
  Volume2,
  Play,
  Pause,
  ChevronDown,
  HelpCircle,
  Eye,
  Maximize2
} from 'lucide-react';

import type { MediaFile, TimelineClip, Resolution, Project, AudioTrack } from '@/types';
import BPMDetectorComponent from '../audio/BPMDetector';
import EffectPresetsLibrary from '../effects/EffectPresetsLibrary';
import WaveformDisplay from '../waveform/WaveformDisplay';
import type { EffectPreset } from '../../utils/effects/effectPresets';

// Video resolution options
const VIDEO_RESOLUTIONS: Record<Resolution, { width: number; height: number; label: string; icon: any; windowSize: { width: number; height: number } }> = {
  '9:16': { 
    width: 1080, height: 1920, label: 'モバイル (9:16)', icon: Smartphone,
    windowSize: { width: 380, height: 700 }
  },
  '16:9': { 
    width: 1920, height: 1080, label: 'デスクトップ (16:9)', icon: Monitor,
    windowSize: { width: 700, height: 450 }
  },
  '1:1': { 
    width: 1080, height: 1080, label: 'スクエア (1:1)', icon: Square,
    windowSize: { width: 500, height: 550 }
  },
  '4:3': { 
    width: 1440, height: 1080, label: 'クラシック (4:3)', icon: Tablet,
    windowSize: { width: 600, height: 500 }
  },
  '720p': { 
    width: 1280, height: 720, label: 'HD (720p)', icon: Monitor,
    windowSize: { width: 640, height: 400 }
  },
  '1080p': { 
    width: 1920, height: 1080, label: 'Full HD (1080p)', icon: Monitor,
    windowSize: { width: 700, height: 450 }
  },
  '4K': { 
    width: 3840, height: 2160, label: '4K Ultra HD', icon: Monitor,
    windowSize: { width: 800, height: 500 }
  },
  'custom': { 
    width: 1920, height: 1080, label: 'カスタム', icon: Settings,
    windowSize: { width: 700, height: 450 }
  }
};

interface RightPanelProps {
  project: Project;
  selectedClip?: TimelineClip;
  videoResolution: Resolution;
  previewWindows: string[];
  onResolutionChange: (resolution: Resolution) => void;
  onCreatePreviewWindow: (resolution: Resolution) => void;
  onClosePreviewWindow: (windowId: string) => void;
  onProjectUpdate: (project: Project) => void;
  onApplyPreset: (clip: TimelineClip) => void;
  onPreviewPreset?: (preset: EffectPreset) => void;
}

/**
 * 改良版ライトパネル - レイアウト問題修正版
 * - Text overflow handling with ellipsis and tooltips
 * - Better responsive layout for narrow panels
 * - Improved tab navigation
 * - Fixed audio file selection UI
 * - Better BPM detection result display
 */
const RightPanelFixed: React.FC<RightPanelProps> = ({
  project,
  selectedClip,
  videoResolution,
  previewWindows,
  onResolutionChange,
  onCreatePreviewWindow,
  onClosePreviewWindow,
  onProjectUpdate,
  onApplyPreset,
  onPreviewPreset
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'audio' | 'effects'>('properties');
  const [selectedAudioFile, setSelectedAudioFile] = useState<MediaFile | null>(null);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<AudioTrack | null>(null);

  const audioFiles = project.mediaLibrary.filter(file => file.type === 'audio');
  const audioTracks = project.timeline.audioTracks || [];

  const handleProjectTimeChange = (newDuration: number) => {
    onProjectUpdate({
      ...project,
      settings: {
        ...project.settings,
        duration: newDuration
      },
      timeline: {
        ...project.timeline,
        duration: newDuration
      }
    });
  };

  // BPM検出結果をプロジェクトに反映
  const handleBPMDetected = useCallback((analysis: any) => {
    if (!selectedAudioFile) return;

    const existingTrackIndex = audioTracks.findIndex(track => 
      track.name === selectedAudioFile.name
    );

    let updatedAudioTracks;
    if (existingTrackIndex >= 0) {
      updatedAudioTracks = audioTracks.map((track, index) => 
        index === existingTrackIndex 
          ? {
              ...track,
              bpm: analysis.bpm,
              beats: analysis.beatTimes,
              bars: analysis.bars,
              confidence: analysis.confidence,
              originalFile: selectedAudioFile.originalFile
            }
          : track
      );
    } else {
      const newTrack: AudioTrack = {
        id: `audio_${Date.now()}`,
        name: selectedAudioFile.name,
        url: selectedAudioFile.url,
        startTime: 0,
        duration: selectedAudioFile.duration || 0,
        volume: 1,
        muted: false,
        bpm: analysis.bpm,
        beats: analysis.beatTimes,
        bars: analysis.bars,
        confidence: analysis.confidence,
        originalFile: selectedAudioFile.originalFile
      };
      updatedAudioTracks = [...audioTracks, newTrack];
    }

    onProjectUpdate({
      ...project,
      timeline: {
        ...project.timeline,
        audioTracks: updatedAudioTracks
      }
    });

    const updatedTrack = updatedAudioTracks.find(track => track.name === selectedAudioFile.name);
    if (updatedTrack) {
      setSelectedAudioTrack(updatedTrack);
    }

    console.log('✅ BPM検出結果をプロジェクトに反映:', analysis);
  }, [selectedAudioFile, audioTracks, project, onProjectUpdate]);

  return (
    <div className="h-full flex flex-col bg-dark-800 overflow-hidden">
      {/* ヘッダー - 改良版 */}
      <div className="p-3 border-b border-dark-700 flex-shrink-0">
        <h2 className="text-base font-semibold flex items-center space-x-2 mb-3">
          <Settings className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="truncate" title="コントロールパネル">コントロールパネル</span>
        </h2>
        
        {/* タブナビゲーション - レスポンシブ対応 */}
        <div className="flex space-x-1">
          {[
            { id: 'properties', label: '設定', shortLabel: '設定', icon: Settings },
            { id: 'audio', label: '音声解析', shortLabel: '音声', icon: Music },
            { id: 'effects', label: 'エフェクト', shortLabel: 'FX', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all min-w-0 ${
                  activeTab === tab.id 
                    ? 'bg-purple-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
                title={tab.label}
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate hidden sm:inline">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* プロパティタブ */}
          {activeTab === 'properties' && (
            <motion.div
              key="properties"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800"
            >
              <div className="p-3 space-y-4">
                {/* プレビューウィンドウ管理 - 改良版 */}
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
                    <Maximize2 className="w-4 h-4 text-blue-400" />
                    <span className="truncate">プレビューウィンドウ</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {Object.entries(VIDEO_RESOLUTIONS).slice(0, 4).map(([key, resolution]) => {
                      const Icon = resolution.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => onCreatePreviewWindow(key as Resolution)}
                          className="flex items-center justify-between bg-dark-700 hover:bg-dark-600 text-left px-2 py-1.5 rounded text-xs transition-all min-w-0"
                          title={`${resolution.label}でプレビューウィンドウを開く`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Icon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{resolution.label}</span>
                          </span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                        </button>
                      );
                    })}
                    
                    {/* その他の解像度 - 折りたたみ可能 */}
                    <details className="group">
                      <summary className="flex items-center justify-between bg-dark-700 hover:bg-dark-600 cursor-pointer px-2 py-1.5 rounded text-xs transition-all">
                        <span className="flex items-center gap-1.5">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                          <span className="truncate">その他の解像度</span>
                        </span>
                      </summary>
                      <div className="mt-1 space-y-1">
                        {Object.entries(VIDEO_RESOLUTIONS).slice(4).map(([key, resolution]) => {
                          const Icon = resolution.icon;
                          return (
                            <button
                              key={key}
                              onClick={() => onCreatePreviewWindow(key as Resolution)}
                              className="flex items-center justify-between bg-dark-600 hover:bg-dark-500 text-left px-2 py-1 rounded text-xs transition-all w-full min-w-0"
                              title={`${resolution.label}でプレビューウィンドウを開く`}
                            >
                              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Icon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{resolution.label}</span>
                              </span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                </div>

                {/* アクティブウィンドウ */}
                {previewWindows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-green-400" />
                      <span className="truncate">アクティブウィンドウ</span>
                      <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">{previewWindows.length}</span>
                    </h3>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin">
                      {previewWindows.map((windowId, index) => (
                        <div
                          key={windowId}
                          className="flex items-center justify-between bg-dark-700 px-2 py-1.5 rounded text-xs min-w-0"
                        >
                          <span className="text-gray-300 truncate flex-1" title={`プレビューウィンドウ ${index + 1}`}>
                            プレビュー {index + 1}
                          </span>
                          <button
                            onClick={() => onClosePreviewWindow(windowId)}
                            className="bg-red-500 hover:bg-red-600 text-white p-0.5 rounded flex-shrink-0 ml-2"
                            title="ウィンドウを閉じる"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* プロジェクト情報 - 改良版 */}
                <div className="bg-dark-700 rounded-lg p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Music className="w-4 h-4 text-green-400" />
                    <span className="truncate">プロジェクト情報</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 truncate">現在の長さ:</span>
                      <span className="text-white font-medium" title={`${project.timeline.duration}秒`}>
                        {Math.floor(project.timeline.duration / 60)}:{(project.timeline.duration % 60).toFixed(0).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 truncate">クリップ数:</span>
                      <span className="text-white font-medium">{project.timeline.clips.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 truncate">音声トラック:</span>
                      <span className="text-white font-medium">{audioTracks.length}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-dark-600 rounded">
                      💡 音楽ファイルをアップロードすると、プロジェクトの長さが自動的に調整されます
                    </div>
                  </div>
                </div>

                {/* 設定 - 改良版 */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" title="出力動画の解像度">解像度</label>
                    <div className="relative">
                      <select 
                        value={videoResolution}
                        onChange={(e) => onResolutionChange(e.target.value as Resolution)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-2 py-1.5 text-sm appearance-none cursor-pointer pr-8"
                      >
                        {Object.entries(VIDEO_RESOLUTIONS).map(([key, resolution]) => (
                          <option key={key} value={key}>
                            {resolution.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" title="動画のフレームレート">フレームレート</label>
                    <div className="relative">
                      <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-2 py-1.5 text-sm appearance-none cursor-pointer pr-8">
                        <option>30 FPS</option>
                        <option>60 FPS</option>
                        <option>24 FPS</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" title="プロジェクトの合計時間（秒）">プロジェクト時間</label>
                    <input 
                      type="number"
                      min="60"
                      max="600"
                      value={project.timeline.duration}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value) || 60;
                        handleProjectTimeChange(newDuration);
                      }}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-2 py-1.5 text-sm"
                      placeholder="秒数を入力"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      60～600秒の間で設定できます
                    </div>
                  </div>
                </div>

                {!selectedClip && (
                  <div className="text-center text-gray-400 py-6">
                    <Info className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm">クリップを選択してプロパティを編集</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 音声解析タブ - 改良版 */}
          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* 音声ファイル/トラック選択 - 改良版 */}
              <div className="p-3 border-b border-dark-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium truncate flex-1">音声ファイルを選択</h3>
                  <div className="flex items-center space-x-1 text-xs text-gray-400 flex-shrink-0">
                    <Activity className="w-3 h-3" />
                    <span className="hidden sm:inline">BPM検出</span>
                  </div>
                </div>
                
                {audioFiles.length === 0 ? (
                  <div className="text-center py-4">
                    <Music className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">音声ファイルがありません</p>
                    <p className="text-gray-500 text-xs mt-1">左のメディアライブラリから音楽をアップロードしてください</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">
                    {audioFiles.map((audioFile) => (
                      <button
                        key={audioFile.id}
                        onClick={() => {
                          setSelectedAudioFile(audioFile);
                          const correspondingTrack = audioTracks.find(track => track.name === audioFile.name);
                          setSelectedAudioTrack(correspondingTrack || null);
                        }}
                        className={`w-full text-left p-2 rounded border transition-all min-w-0 ${
                          selectedAudioFile?.id === audioFile.id
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-dark-700 border-dark-600 hover:border-dark-500 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Music className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={audioFile.name}>
                              {audioFile.name}
                            </p>
                            <div className="text-xs text-gray-500 truncate">
                              {audioFile.duration ? `${Math.floor(audioFile.duration / 60)}:${(audioFile.duration % 60).toFixed(0).padStart(2, '0')}` : '不明'}
                              {(() => {
                                const track = audioTracks.find(t => t.name === audioFile.name);
                                return track?.bpm ? ` • ${track.bpm} BPM` : '';
                              })()}
                            </div>
                          </div>
                          {/* 信頼度インジケーター - 改良版 */}
                          {(() => {
                            const track = audioTracks.find(t => t.name === audioFile.name);
                            if (track?.confidence) {
                              const confidence = Math.round(track.confidence * 100);
                              return (
                                <div 
                                  className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                                    confidence >= 70 ? 'bg-green-500/20 text-green-400' :
                                    confidence >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}
                                  title={`BPM検出信頼度: ${confidence}%`}
                                >
                                  {confidence}%
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 音声波形表示エリア - 改良版 */}
              {selectedAudioTrack && (
                <div className="p-3 border-b border-dark-700 bg-dark-850 flex-shrink-0">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span className="truncate">音声波形</span>
                  </h4>
                  <div className="bg-dark-800 rounded-lg p-2">
                    <WaveformDisplay
                      audioTrack={{
                        ...selectedAudioTrack,
                        originalFile: selectedAudioTrack.originalFile || selectedAudioFile?.originalFile
                      }}
                      width={200}
                      height={60}
                      startTime={0}
                      duration={selectedAudioTrack.duration}
                      zoom={1}
                      color={selectedAudioTrack.muted ? '#6b7280' : '#06b6d4'}
                      showBeats={true}
                      className="w-full"
                      onWaveformClick={(time) => {
                        console.log(`Waveform clicked at ${time}s`);
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1.5 flex justify-between">
                    <span title="検出されたビート数">ビート数: {selectedAudioTrack.beats?.length || 0}</span>
                    <span title="検出された小節数">小節数: {selectedAudioTrack.bars?.length || 0}</span>
                  </div>
                </div>
              )}
              
              {/* BPM検出エリア */}
              <div className="flex-1 overflow-hidden">
                {selectedAudioFile ? (
                  <div className="h-full p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">
                    <BPMDetectorComponent
                      audioFile={selectedAudioFile}
                      onBPMDetected={handleBPMDetected}
                    />
                    
                    {/* BPM検出の信頼性について - 改良版 */}
                    <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                      <div className="flex items-start space-x-2">
                        <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-300 min-w-0">
                          <p className="font-medium mb-1">BPM検出の信頼度について</p>
                          <div className="space-y-0.5">
                            <p>• 70%以上: 高精度（推奨）</p>
                            <p>• 40-69%: 中程度（要確認）</p>
                            <p>• 40%未満: 低精度（手動調整推奨）</p>
                          </div>
                          <p className="mt-1 text-amber-400 text-xs">
                            信頼度が低い場合は、楽曲の構造を手動で確認してください
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                      <Zap className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">音声ファイルを選択してBPM検出を開始</p>
                      <p className="text-gray-500 text-xs mt-1">選択後、音声波形も表示されます</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* エフェクトタブ */}
          {activeTab === 'effects' && (
            <motion.div
              key="effects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <EffectPresetsLibrary
                selectedClip={selectedClip}
                onApplyPreset={onApplyPreset}
                onPreviewPreset={onPreviewPreset}
                className="h-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RightPanelFixed;