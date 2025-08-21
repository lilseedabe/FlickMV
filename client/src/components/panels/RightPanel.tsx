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
  Pause
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

const RightPanel: React.FC<RightPanelProps> = ({
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

    // 既存のオーディオトラックを更新、または新規作成
    const existingTrackIndex = audioTracks.findIndex(track => 
      track.name === selectedAudioFile.name
    );

    let updatedAudioTracks;
    if (existingTrackIndex >= 0) {
      // 既存トラックを更新
      updatedAudioTracks = audioTracks.map((track, index) => 
        index === existingTrackIndex 
          ? {
              ...track,
              bpm: analysis.bpm,
              beats: analysis.beatTimes,
              bars: analysis.bars,
              confidence: analysis.confidence
            }
          : track
      );
    } else {
      // 新規トラックを作成
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
        confidence: analysis.confidence
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

    console.log('✅ BPM検出結果をプロジェクトに反映:', analysis);
  }, [selectedAudioFile, audioTracks, project, onProjectUpdate]);

  return (
    <div className="h-full flex flex-col bg-dark-800">
      {/* ヘッダー */}
      <div className="p-4 border-b border-dark-700 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center space-x-2 mb-3">
          <Settings className="w-5 h-5 text-purple-400" />
          <span>コントロールパネル</span>
        </h2>
        
        {/* タブナビゲーション */}
        <div className="flex space-x-1">
          {[
            { id: 'properties', label: '設定', icon: Settings },
            { id: 'audio', label: '音声解析', icon: Music },
            { id: 'effects', label: 'エフェクト', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-purple-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{tab.label}</span>
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
              <div className="p-4 space-y-6">
                {/* プレビューウィンドウ管理 */}
                <div>
                  <h3 className="text-sm font-medium mb-3">プレビューウィンドウ</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(VIDEO_RESOLUTIONS).map(([key, resolution]) => {
                      const Icon = resolution.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => onCreatePreviewWindow(key as Resolution)}
                          className="flex items-center justify-between bg-dark-700 hover:bg-dark-600 text-left px-3 py-2 rounded-lg text-sm transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="truncate">{resolution.label}</span>
                          </span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* アクティブウィンドウ */}
                {previewWindows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">アクティブウィンドウ</h3>
                    <div className="space-y-2">
                      {previewWindows.map((windowId, index) => (
                        <div
                          key={windowId}
                          className="flex items-center justify-between bg-dark-700 px-3 py-2 rounded-lg"
                        >
                          <span className="text-sm text-gray-300">プレビュー {index + 1}</span>
                          <button
                            onClick={() => onClosePreviewWindow(windowId)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* プロジェクト情報 */}
                <div className="bg-dark-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Music className="w-4 h-4 text-green-400" />
                    プロジェクト情報
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">現在の長さ:</span>
                      <span className="text-white font-medium">
                        {Math.floor(project.timeline.duration / 60)}:{(project.timeline.duration % 60).toFixed(0).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      💡 音楽ファイルをアップロードすると、プロジェクトの長さが自動的に調整されます
                    </div>
                  </div>
                </div>

                {/* 設定 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">解像度</label>
                    <select 
                      value={videoResolution}
                      onChange={(e) => onResolutionChange(e.target.value as Resolution)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                    >
                      {Object.entries(VIDEO_RESOLUTIONS).map(([key, resolution]) => (
                        <option key={key} value={key}>
                          {resolution.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">フレームレート</label>
                    <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm">
                      <option>30 FPS</option>
                      <option>60 FPS</option>
                      <option>24 FPS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">プロジェクト時間</label>
                    <input 
                      type="number"
                      min="60"
                      max="600"
                      value={project.timeline.duration}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value) || 60;
                        handleProjectTimeChange(newDuration);
                      }}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                      placeholder="秒数を入力"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      60～600秒の間で設定できます
                    </div>
                  </div>
                </div>

                {!selectedClip && (
                  <div className="text-center text-gray-400 py-8">
                    <Info className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">クリップを選択してプロパティを編集</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 音声解析タブ - 強化版 */}
          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* 音声ファイル/トラック選択 */}
              <div className="p-4 border-b border-dark-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">音声ファイルを選択</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Activity className="w-3 h-3" />
                    <span>BPM検出 + 波形解析</span>
                  </div>
                </div>
                
                {audioFiles.length === 0 ? (
                  <div className="text-center py-6">
                    <Music className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">音声ファイルがありません</p>
                    <p className="text-gray-500 text-xs mt-1">左のメディアライブラリから音楽をアップロードしてください</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">
                    {audioFiles.map((audioFile) => (
                      <button
                        key={audioFile.id}
                        onClick={() => {
                          setSelectedAudioFile(audioFile);
                          // 対応するオーディオトラックがあれば選択
                          const correspondingTrack = audioTracks.find(track => track.name === audioFile.name);
                          setSelectedAudioTrack(correspondingTrack || null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedAudioFile?.id === audioFile.id
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-dark-700 border-dark-600 hover:border-dark-500 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Music className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{audioFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {audioFile.duration ? `${Math.floor(audioFile.duration / 60)}:${(audioFile.duration % 60).toFixed(0).padStart(2, '0')}` : '不明'}
                              {/* BPM情報があれば表示 */}
                              {(() => {
                                const track = audioTracks.find(t => t.name === audioFile.name);
                                return track?.bpm ? ` • ${track.bpm} BPM` : '';
                              })()}
                            </p>
                          </div>
                          {/* 信頼度インジケーター */}
                          {(() => {
                            const track = audioTracks.find(t => t.name === audioFile.name);
                            if (track?.confidence) {
                              const confidence = Math.round(track.confidence * 100);
                              return (
                                <div className={`text-xs px-2 py-1 rounded ${
                                  confidence >= 70 ? 'bg-green-500/20 text-green-400' :
                                  confidence >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
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
              
              {/* 音声波形表示エリア */}
              {selectedAudioTrack && (
                <div className="p-4 border-b border-dark-700 bg-dark-850">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    音声波形
                  </h4>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <WaveformDisplay
                      audioTrack={selectedAudioTrack}
                      width={240}
                      height={80}
                      startTime={0}
                      duration={selectedAudioTrack.duration}
                      zoom={1}
                      color={selectedAudioTrack.muted ? '#6b7280' : '#06b6d4'}
                      showBeats={true}
                      className="w-full"
                      onWaveformClick={(time) => {
                        console.log(`Waveform clicked at ${time}s`);
                        // ここで再生位置の移動などを実装
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-2 flex justify-between">
                    <span>ビート数: {selectedAudioTrack.beats?.length || 0}</span>
                    <span>小節数: {selectedAudioTrack.bars?.length || 0}</span>
                  </div>
                </div>
              )}
              
              {/* BPM検出エリア */}
              <div className="flex-1 overflow-hidden">
                {selectedAudioFile ? (
                  <div className="h-full p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">
                    <BPMDetectorComponent
                      audioFile={selectedAudioFile}
                      onBPMDetected={handleBPMDetected}
                    />
                    
                    {/* BPM検出の信頼性について */}
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-300">
                          <p className="font-medium mb-1">BPM検出の信頼度について</p>
                          <p>• 70%以上: 高精度（推奨）</p>
                          <p>• 40-69%: 中程度（要確認）</p>
                          <p>• 40%未満: 低精度（手動調整推奨）</p>
                          <p className="mt-1 text-amber-400">
                            信頼度が低い場合は、楽曲の構造を手動で確認してください
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-gray-500 mx-auto mb-3" />
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

export default RightPanel;