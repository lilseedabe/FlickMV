import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';

// Components
import MediaLibrary from '../components/media/MediaLibrary';
import Timeline from '../components/timeline/Timeline';
import Preview from '../components/preview/Preview';
import PropertiesPanel from '../components/editor/PropertiesPanel';
import PlaybackControls from '../components/editor/PlaybackControls';

// Context
import { useUser } from '../contexts/UserContext';

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
  AlertCircle,
  Save,
  FolderOpen,
  GripVertical,
  Monitor,
  Smartphone,
  Tablet,
  Maximize,
  Minimize
} from 'lucide-react';

// Types
import type { Project, TimelineClip, MediaFile, Resolution } from '../types';

// Video resolution options (actual output size)
const VIDEO_RESOLUTIONS: Record<Resolution, { width: number; height: number; label: string; icon: any }> = {
  '9:16': { width: 1080, height: 1920, label: 'モバイル (9:16)', icon: Smartphone },
  '16:9': { width: 1920, height: 1080, label: 'デスクトップ (16:9)', icon: Monitor },
  '1:1': { width: 1080, height: 1080, label: 'スクエア (1:1)', icon: Square },
  '4:3': { width: 1440, height: 1080, label: 'クラシック (4:3)', icon: Tablet },
  '720p': { width: 1280, height: 720, label: 'HD (720p)', icon: Monitor },
  '1080p': { width: 1920, height: 1080, label: 'Full HD (1080p)', icon: Monitor },
  '4K': { width: 3840, height: 2160, label: '4K Ultra HD', icon: Monitor },
  'custom': { width: 1920, height: 1080, label: 'カスタム', icon: Settings }
};

// Preview display sizes (for UI only)
const PREVIEW_SIZES = {
  small: { scale: 0.15, label: 'S' },
  medium: { scale: 0.2, label: 'M' },
  large: { scale: 0.25, label: 'L' }
};

type PreviewSizeKey = keyof typeof PREVIEW_SIZES;

// Empty project template
const createEmptyProject = (): Project => {
  const now = new Date();
  return {
    id: `project_${Date.now()}`,
    name: 'Untitled Project',
    description: '',
    createdAt: now,
    updatedAt: now,
    settings: {
      resolution: '9:16',
      frameRate: 30,
      duration: 60,
      outputFormat: {
        container: 'mp4',
        videoCodec: 'h264',
        audioBitrate: 128,
        videoBitrate: 5000,
        quality: 'high'
      }
    },
    timeline: {
      clips: [],
      audioTracks: [],
      duration: 60,
      zoom: 1,
      playheadPosition: 0
    },
    mediaLibrary: []
  };
};

const Editor: React.FC = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project>(createEmptyProject());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [selectedClip, setSelectedClip] = useState<TimelineClip | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [activePanel, setActivePanel] = useState<'media' | 'effects'>('media');
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Panel resizing state
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  
  // Preview size state
  const [previewSize, setPreviewSize] = useState<PreviewSizeKey>('medium');
  const [showPreviewControls, setShowPreviewControls] = useState(false);
  
  // Video resolution state
  const [videoResolution, setVideoResolution] = useState<Resolution>(project.settings.resolution);
  
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
  const containerRef = useRef<HTMLDivElement>(null);

  const tutorialSteps = [
    {
      title: "メディアライブラリ",
      description: "左側のパネルから画像、動画、音声ファイルをアップロードまたは選択できます。パネルの境界をドラッグしてサイズを調整できます。",
      target: "media-library"
    },
    {
      title: "プレビュー画面",
      description: "中央のプレビュー画面で作品の仕上がりを確認できます。右上のボタンでプレビューサイズを調整できます。",
      target: "preview-area"
    },
    {
      title: "タイムライン",
      description: "下部のタイムラインでクリップの順序や長さを調整します",
      target: "timeline"
    },
    {
      title: "プロパティパネル",
      description: "右側のパネルでエフェクトや設定を調整できます。パネル幅も自由に調整可能です。",
      target: "effects-panel"
    },
  ];

  const currentTutorialStep = (tutorialSteps[tutorialStep] ?? tutorialSteps[0])!;
  const currentPreviewSize = PREVIEW_SIZES[previewSize];
  const currentVideoResolution = VIDEO_RESOLUTIONS[videoResolution];
  
  // Calculate preview dimensions based on video resolution and scale
  const previewWidth = Math.round(currentVideoResolution.width * currentPreviewSize.scale);
  const previewHeight = Math.round(currentVideoResolution.height * currentPreviewSize.scale);

  // Panel resizing logic
  const handleMouseDown = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(side);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const minWidth = 200;
    const maxWidth = containerRect.width * 0.4; // Max 40% of container width

    if (isResizing === 'left') {
      const newWidth = Math.min(Math.max(e.clientX - containerRect.left, minWidth), maxWidth);
      setLeftPanelWidth(newWidth);
    } else if (isResizing === 'right') {
      const newWidth = Math.min(Math.max(containerRect.right - e.clientX, minWidth), maxWidth);
      setRightPanelWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMediaUpload = (files: FileList) => {
    console.log('Uploading files:', files);
    // TODO: Implement actual file upload
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

  const handleExport = () => {
    if (user.exportStats.remaining <= 0) {
      alert('エクスポート制限に達しました。プランをアップグレードしてください。');
      return;
    }
    setShowExportModal(true);
  };
  
  const handleResolutionChange = (newResolution: Resolution) => {
    setVideoResolution(newResolution);
    setProject(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        resolution: newResolution
      }
    }));
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
                  {currentTutorialStep.description}
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

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
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
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full m-4 border border-green-500/30"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">エクスポート設定</h3>
                
                <div className="space-y-4 text-left mb-6">
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
                    <label className="block text-sm font-medium mb-2">品質</label>
                    <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2">
                      <option>高品質</option>
                      <option>標準</option>
                      <option>圧縮</option>
                    </select>
                  </div>
                  
                  {!user.canRemoveWatermark && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Lock className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-yellow-400 font-medium">透かし付きでエクスポート</p>
                          <p className="text-gray-300">透かしを削除するにはプランをアップグレードしてください</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="text-sm text-center">
                      <p className="text-blue-400">残りエクスポート: {user.exportStats.remaining}/{user.exportStats.limit}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 bg-dark-700 text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-dark-600 transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement actual export
                      console.log('Starting export...');
                      setShowExportModal(false);
                    }}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-all"
                  >
                    エクスポート開始
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
        className="bg-dark-800 border-b border-dark-700 px-4 sm:px-6 py-3"
      >
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <FolderOpen className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">{project.name}</h1>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>自動保存済み</span>
              </div>
            </div>
          </div>

          {/* Center - Plan info */}
          <div className="hidden md:flex items-center space-x-4">
            {!user.canRemoveWatermark && (
              <div className="flex items-center space-x-2 bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-sm">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">透かし付き</span>
              </div>
            )}
            
            <div className="text-sm text-gray-400">
              <span className="hidden sm:inline">エクスポート残り: </span>
              <span className="font-medium text-blue-400">{user.exportStats.remaining}/{user.exportStats.limit}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTutorial(true)}
              className="hidden sm:flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 px-3 py-1.5 rounded-lg text-sm transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span>ヘルプ</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={user.exportStats.remaining <= 0}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>エクスポート</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Left Panel */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="bg-dark-800 border-r border-dark-700 flex flex-col relative"
          style={{ width: leftPanelWidth }}
          id="media-library"
          ref={leftPanelRef}
        >
          <div className="p-4 border-b border-dark-700">
            <div className="flex space-x-1">
              {[
                { id: 'media', label: 'メディア', icon: Image },
                { id: 'effects', label: 'エフェクト', icon: Sparkles }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(tab.id as any)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activePanel === tab.id 
                        ? 'bg-purple-500 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
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
                
                {project.mediaLibrary.length === 0 && (
                  <div className="text-center py-8">
                    <Image className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">メディアファイルがありません</p>
                    <p className="text-gray-500 text-xs mt-1">ファイルをアップロードして始めましょう</p>
                  </div>
                )}
              </div>
            )}

            {activePanel === 'effects' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">エフェクト</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'フェードイン', icon: Eye },
                    { name: 'フェードアウト', icon: EyeOff },
                    { name: 'ズーム', icon: Move },
                    { name: '回転', icon: RotateCw },
                    { name: 'ぼかし', icon: Sparkles },
                    { name: 'カット', icon: Scissors }
                  ].map(effect => {
                    const Icon = effect.icon;
                    return (
                      <button
                        key={effect.name}
                        className="bg-dark-700 hover:bg-dark-600 p-3 rounded-lg transition-all text-center"
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                        <span className="text-xs">{effect.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Left Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-purple-500/50 transition-colors group"
            onMouseDown={handleMouseDown('left')}
          >
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </motion.div>

        {/* Center Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Video Resolution Controls */}
          <div className="bg-dark-800 border-b border-dark-700 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-300">出力解像度:</span>
                <div className="flex items-center space-x-1">
                  {(['9:16', '16:9', '1:1', '4:3'] as Resolution[]).map((key) => {
                    const resolution = VIDEO_RESOLUTIONS[key];
                    const Icon = resolution.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleResolutionChange(key)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                          videoResolution === key
                            ? 'bg-blue-500 text-white'
                            : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{resolution.label}</span>
                        <span className="text-xs">{resolution.width}×{resolution.height}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                現在: {currentVideoResolution.width}×{currentVideoResolution.height}
              </div>
            </div>
          </div>
          
          {/* Preview Area */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-dark-850 border-b border-dark-700 flex items-center justify-center relative overflow-auto"
            id="preview-area"
          >
            {/* Preview Size Controls */}
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center space-x-2">
                {/* Preview Scale Info */}
                <div className="bg-dark-700/90 backdrop-blur-sm border border-dark-600 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <Eye className="w-4 h-4" />
                    <span>{Math.round(currentPreviewSize.scale * 100)}%</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {previewWidth}×{previewHeight}
                  </div>
                </div>
                
                {/* Scale Toggle Buttons */}
                <div className="flex items-center bg-dark-700/90 backdrop-blur-sm border border-dark-600 rounded-lg p-1">
                  {Object.entries(PREVIEW_SIZES).map(([key, size]) => (
                    <button
                      key={key}
                      onClick={() => setPreviewSize(key as PreviewSizeKey)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        previewSize === key
                          ? 'bg-cyan-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-dark-600'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Container */}
            <div 
              className="relative bg-black rounded-lg overflow-hidden border border-gray-700 shadow-2xl m-4"
              style={{ 
                width: previewWidth, 
                height: previewHeight,
                transition: 'all 0.3s ease',
                maxWidth: '90%',
                maxHeight: '90%'
              }}
            >
              <Preview 
                project={project}
                playheadPosition={playheadPosition}
                isPlaying={isPlaying}
              />
              
              {!user.canRemoveWatermark && (
                <div className="absolute bottom-2 right-2 text-xs text-white/60 bg-black/50 px-2 py-1 rounded">
                  FlickMV
                </div>
              )}
              
              {project.mediaLibrary.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Video className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">プレビューなし</p>
                    <p className="text-xs text-gray-500 mt-1">メディアを追加してください</p>
                  </div>
                </div>
              )}
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
            className="h-64 bg-dark-900"
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
          className="bg-dark-800 border-l border-dark-700 flex flex-col relative"
          style={{ width: rightPanelWidth }}
          id="effects-panel"
          ref={rightPanelRef}
        >
          {/* Right Resize Handle */}
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-purple-500/50 transition-colors group"
            onMouseDown={handleMouseDown('right')}
          >
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <span>プロパティ</span>
            </h2>
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
            
            {!selectedClip && (
              <div className="p-4 text-center text-gray-400">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">クリップを選択してプロパティを編集</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-800 border-t border-dark-700 px-6 py-2 text-sm text-gray-400"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span>解像度: {currentVideoResolution.width}×{currentVideoResolution.height}</span>
            <span>FPS: {project.settings.frameRate}</span>
            <span>長さ: {Math.floor(project.timeline.duration / 60)}:{(project.timeline.duration % 60).toFixed(0).padStart(2, '0')}</span>
            <span>プレビュー: {Math.round(currentPreviewSize.scale * 100)}% ({previewWidth}×{previewHeight})</span>
          </div>
          <div className="flex items-center space-x-6">
            <span>クリップ: {project.timeline.clips.length}</span>
            <span className="capitalize">プラン: {user.plan}</span>

            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>準備完了</span>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Editor;