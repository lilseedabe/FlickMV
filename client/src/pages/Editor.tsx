import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';

// Components
import MediaLibrary from '../components/media/MediaLibrary';
import Timeline from '../components/timeline/Timeline';
import Preview from '../components/preview/Preview';
import PropertiesPanel from '../components/editor/PropertiesPanel';
import PlaybackControls from '../components/editor/PlaybackControls';

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Settings,
  Download,
  Upload,
  Layers,
  Eye,
  EyeOff,
  Type,
  Image,
  Video,
  Music,
  Scissors,
  RotateCw,
  Move,
  Zap,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  X,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Square,
  Circle,
  Crown,
  Lock,
  Star,
  Info,
  AlertCircle
} from 'lucide-react';

// Types
import type { Project, TimelineClip, MediaFile } from '../types';

// Mock data - in real app this would come from API
const mockProject: Project = {
  id: '1',
  name: 'Summer Vibes MV',
  description: 'A vibrant music video with summer themes',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
  settings: {
    resolution: '9:16',
    frameRate: 30,
    duration: 45,
    outputFormat: {
      container: 'mp4',
      videoCodec: 'h264',
      audioBitrate: 128,
      videoBitrate: 5000,
      quality: 'high'
    }
  },
  timeline: {
    clips: [
      {
        id: 'clip1',
        mediaId: 'media1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
        layer: 0,
        effects: [
          {
            id: 'effect1',
            type: 'pan_zoom',
            parameters: { zoom: 1.2, panX: 0.1, panY: 0.1 },
            enabled: true
          }
        ]
      },
      {
        id: 'clip2',
        mediaId: 'media2',
        startTime: 5,
        duration: 4,
        trimStart: 0,
        trimEnd: 4,
        layer: 0,
        transitions: {
          in: { type: 'crossfade', duration: 0.5 }
        }
      }
    ],
    audioTracks: [
      {
        id: 'audio1',
        mediaId: 'audio1',
        startTime: 0,
        duration: 45,
        volume: 0.8,
        bpm: 120,
        beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
      }
    ],
    duration: 45,
    zoom: 1,
    playheadPosition: 0
  },
  mediaLibrary: [
    {
      id: 'media1',
      name: 'sunset-beach.jpg',
      type: 'image',
      url: 'https://via.placeholder.com/1080x1920/ff6b6b/ffffff?text=Sunset+Beach',
      thumbnail: 'https://via.placeholder.com/150x200/ff6b6b/ffffff?text=Sunset',
      size: 2048000,
      width: 1080,
      height: 1920,
      format: 'jpg',
      uploadedAt: new Date('2024-01-15')
    },
    {
      id: 'media2',
      name: 'palm-trees.jpg',
      type: 'image',
      url: 'https://via.placeholder.com/1080x1920/4ecdc4/ffffff?text=Palm+Trees',
      thumbnail: 'https://via.placeholder.com/150x200/4ecdc4/ffffff?text=Palm',
      size: 1856000,
      width: 1080,
      height: 1920,
      format: 'jpg',
      uploadedAt: new Date('2024-01-16')
    },
    {
      id: 'audio1',
      name: 'summer-beat.mp3',
      type: 'audio',
      url: '/assets/audio/summer-beat.mp3',
      duration: 45,
      size: 4200000,
      format: 'mp3',
      uploadedAt: new Date('2024-01-17'),
      metadata: {
        bitrate: 320,
        channels: 2
      }
    }
  ]
};

const Editor: React.FC = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project>(mockProject);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [selectedClip, setSelectedClip] = useState<TimelineClip | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [activePanel, setActivePanel] = useState<'media' | 'effects' | 'export'>('media');
  
  // Mock user data
  const [user] = useState({
    id: 'user1',
    plan: 'free', // free, basic, pro, premium
    canRemoveWatermark: false,
    exportStats: {
      currentMonth: 2,
      total: 15,
      limit: 5,
      remaining: 3
    }
  });


  // Refs for panel resizing
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const tutorialSteps = [
    {
      title: "メディアライブラリ",
      description: "左側のパネルから画像、動画、音声ファイルをアップロードまたは選択できます",
      target: "media-library"
    },
    {
      title: "プレビュー画面",
      description: "中央のプレビュー画面で作品の仕上がりを確認できます。透かしもここで確認できます",
      target: "preview-area"
    },
    {
      title: "タイムライン",
      description: "下部のタイムラインでクリップの順序や長さを調整します",
      target: "timeline"
    },
    {
      title: "プロパティパネル",
      description: "右側のパネルでエフェクトや透かし設定を調整できます",
      target: "effects-panel"
    },
  ];
  const currentTutorialStep = (tutorialSteps[tutorialStep] ?? tutorialSteps[0])!;
  const currentTutorialTitle = currentTutorialStep.title;
  const currentTutorialDescription = currentTutorialStep.description;

  const handleMediaUpload = (files: FileList) => {
    console.log('Uploading files:', files);
  };

  const handleClipSelect = (clip: TimelineClip) => {
    setSelectedClip(clip);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = (time: number) => {
    setPlayheadPosition(time);
  };


  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(0);
    }
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(0);
  };

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenEditorTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('hasSeenEditorTutorial', 'true');
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-dark-900 text-white overflow-hidden">
      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full m-4 border border-purple-500/30"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {currentTutorialStep.title}
                </h3>
                <p className="text-gray-300 mb-6">
                  {currentTutorialDescription}
                </p>
                <div className="flex items-center justify-center space-x-2 mb-6">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === tutorialStep ? 'bg-purple-500' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={skipTutorial}
                    className="flex-1 bg-dark-700 text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-dark-600 transition-all"
                  >
                    スキップ
                  </button>
                  <button
                    onClick={nextTutorialStep}
                    className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-600 transition-all flex items-center justify-center space-x-1"
                  >
                    <span>{tutorialStep < tutorialSteps.length - 1 ? '次へ' : '完了'}</span>
                    {tutorialStep < tutorialSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-800 border-b border-dark-700 px-6 py-3 flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>●</span>
            <span>自動保存</span>
          </div>
          {!user.canRemoveWatermark && (
            <div className="flex items-center space-x-2 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-sm">
              <Lock className="w-3 h-3" />
              <span>FlickMV透かし付き</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
            エクスポート残り: {user.exportStats.remaining}/{user.exportStats.limit}
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 px-3 py-1.5 rounded-lg text-sm transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span>ヘルプ</span>
          </button>
          <button className="bg-green-500 hover:bg-green-600 px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>エクスポート</span>
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 bg-dark-800 border-r border-dark-700 flex flex-col"
          id="media-library"
          ref={leftPanelRef}
        >
          <div className="p-4 border-b border-dark-700">
            <div className="flex space-x-1 mb-4">
              {[
                { id: 'media', label: 'メディア', icon: Image },
                { id: 'effects', label: 'エフェクト', icon: Sparkles },
                { id: 'export', label: 'エクスポート', icon: Download }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={tab.id === 'watermark' ? 'watermark-tab' : undefined}
                    onClick={() => setActivePanel(tab.id as any)}
                    className={`flex items-center space-x-1 px-2 py-2 rounded-lg text-xs transition-all ${
                      activePanel === tab.id ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activePanel === 'media' && (
              <div className="p-4">
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 mb-4">
                  <Upload className="w-5 h-5" />
                  <span>ファイルをアップロード</span>
                </button>
                
                <MediaLibrary 
                  mediaFiles={project.mediaLibrary}
                  onUpload={handleMediaUpload}
                />
              </div>
            )}

            {activePanel === 'effects' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">エフェクト</h3>
                <div className="space-y-3">
                  {['フェードイン', 'フェードアウト', 'ズーム', '回転', 'ぼかし'].map(effect => (
                    <button
                      key={effect}
                      className="w-full bg-dark-700 hover:bg-dark-600 text-left py-3 px-4 rounded-lg transition-all"
                    >
                      {effect}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {activePanel === 'export' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">エクスポート設定</h3>
                
                {/* Export Limit Warning */}
                {user.exportStats.remaining <= 1 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-yellow-400 font-medium">エクスポート制限間近</p>
                        <p className="text-gray-300">残り {user.exportStats.remaining} 回です</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">解像度</label>
                    <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2">
                      <option>1080p (推奨)</option>
                      <option>720p</option>
                      {user.plan === 'pro' || user.plan === 'premium' ? (
                        <option>4K</option>
                      ) : (
                        <option disabled>4K (プロプラン以上)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">フォーマット</label>
                    <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2">
                      <option>MP4</option>
                      <option>MOV</option>
                      <option>AVI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">品質</label>
                    <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2">
                      <option>高品質</option>
                      <option>標準</option>
                      <option>圧縮</option>
                    </select>
                  </div>

                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Center Area */}
        <div className="flex-1 flex flex-col">
          {/* Preview Area */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-64 bg-dark-850 border-b border-dark-700 flex items-center justify-center relative"
            id="preview-area"
          >
            <div className="relative w-48 h-56 bg-black rounded-lg overflow-hidden">
              <Preview 
                project={project}
                playheadPosition={playheadPosition}
                isPlaying={isPlaying}
              />
              
            </div>
          </motion.div>

          {/* Playback Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800 border-b border-dark-700 p-4"
          >
            <PlaybackControls
              isPlaying={isPlaying}
              currentTime={playheadPosition}
              duration={project.timeline.duration}
              onPlayPause={handlePlayPause}
              onTimeChange={handleTimeUpdate}
            />
          </motion.div>

          {/* Timeline Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 bg-dark-900"
            id="timeline"
          >
            <Timeline
              timeline={project.timeline}
              playheadPosition={playheadPosition}
              zoom={zoom}
              onClipSelect={handleClipSelect}
              onTimelineUpdate={(timeline) => 
                setProject(prev => ({ ...prev, timeline }))
              }
            />
          </motion.div>
        </div>

        {/* Right Panel - Properties */}
        <motion.div
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col"
          id="effects-panel"
          ref={rightPanelRef}
        >
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold">プロパティ</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <PropertiesPanel
              selectedClip={selectedClip}
              projectSettings={project.settings}
              onClipUpdate={(updatedClip) => {
                const updatedTimeline = {
                  ...project.timeline,
                  clips: project.timeline.clips.map(clip =>
                    clip.id === updatedClip.id ? updatedClip : clip
                  )
                };
                setProject(prev => ({ ...prev, timeline: updatedTimeline }));
              }}
              onSettingsUpdate={(settings) => {
                setProject(prev => ({ ...prev, settings }));
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-800 border-t border-dark-700 px-6 py-2 flex items-center justify-between text-sm text-dark-400"
      >
        <div className="flex items-center space-x-6">
          <span>解像度: {project.settings.resolution}</span>
          <span>FPS: {project.settings.frameRate}</span>
          <span>継続時間: {Math.floor(project.timeline.duration / 60)}:{(project.timeline.duration % 60).toFixed(0).padStart(2, '0')}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span>クリップ: {project.timeline.clips.length}</span>
          <span>プラン: {user.plan}</span>
          <span>透かし: {!user.canRemoveWatermark ? '有効' : '無効'}</span>
          <span className="text-green-400">● 自動保存済み</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Editor;