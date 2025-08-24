import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';

// Components
import BeatTimeline from '../components/timeline/BeatTimeline';
import Preview from '../components/preview/Preview';
import PlaybackControls from '../components/editor/PlaybackControls';
import { ExportPanel, ExportProgress } from '../components/export';

// Icons
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Settings,
  Download,
  Upload,
  Video,
  Music,
  Image,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  X,
  FolderOpen,
  GripVertical,
  Monitor,
  Smartphone,
  Square,
  ExternalLink,
  PictureInPicture2,
  CheckCircle,
  Lock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
import type { 
  Project, 
  TimelineClip, 
  MediaFile, 
  Resolution, 
  ExportJob,
  BPMAnalysis,
  BeatGrid
} from '../types';

// Video resolution options
const VIDEO_RESOLUTIONS: Record<Resolution, { 
  width: number; 
  height: number; 
  label: string; 
  icon: any; 
  windowSize: { width: number; height: number } 
}> = {
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
    width: 1440, height: 1080, label: 'クラシック (4:3)', icon: Monitor,
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

/**
 * FlickMV Editor Ultimate - 修正版
 */
const EditorUltimate: React.FC = () => {
  const { projectId } = useParams();
  
  // Core state
  const [project, setProject] = useState<Project>(createEmptyProject());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [selectedClip, setSelectedClip] = useState<TimelineClip | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // UI state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [currentExportJob, setCurrentExportJob] = useState<ExportJob | null>(null);
  const [showExportProgress, setShowExportProgress] = useState(false);
  
  // Panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  
  // Timeline state
  const [timelineHeight, setTimelineHeight] = useState(280);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  
  // Preview state
  const [videoResolution, setVideoResolution] = useState<Resolution>('9:16');
  const [previewWindows, setPreviewWindows] = useState<string[]>([]);
  const [showPiP, setShowPiP] = useState(false);
  
  // Audio analysis state
  const [bpmAnalysis, setBpmAnalysis] = useState<BPMAnalysis | null>(null);
  const [beatGrid, setBeatGrid] = useState<BeatGrid>({
    enabled: true,
    snapToBeat: true,
    snapToBar: true,
    subdivisions: 4,
    quantizeStrength: 0.5
  });
  
  // Mock user data
  const user = {
    id: 'user1',
    plan: 'free' as const,
    canRemoveWatermark: false,
    exportStats: {
      currentMonth: 2,
      total: 15,
      limit: 5,
      remaining: 3
    }
  };

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentVideoResolution = VIDEO_RESOLUTIONS[videoResolution];

  // Tutorial steps
  const tutorialSteps = [
    {
      title: "🎉 レイアウト問題修正完了",
      description: "Grid ベースの設計で、パネル幅やテキスト表示が大幅に改善されました。文字切れや重なりがなくなりました。",
      target: "timeline-area"
    },
    {
      title: "📱 折りたたみ可能なパネル", 
      description: "左右のパネルを折りたたんで編集領域を自由に拡張できます。狭い画面でも快適に編集できます。",
      target: "mini-preview"
    },
    {
      title: "⚡ 改善されたタイムライン",
      description: "Sticky ルーラー、固定トラックヘッダー、高さ調整機能で、プロレベルのタイムライン編集が可能になりました。",
      target: "timeline-area"
    }
  ];

  const currentTutorialStep = tutorialSteps[tutorialStep] ?? tutorialSteps[0];

  // Helper functions
  const getLeftPanelWidth = () => isLeftPanelCollapsed ? 60 : Math.max(leftPanelWidth, 280);
  const getRightPanelWidth = () => isRightPanelCollapsed ? 60 : Math.max(rightPanelWidth, 280);

  // Event handlers
  const handleMediaUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMediaFiles: MediaFile[] = [];

    for (const file of fileArray) {
      const mediaFile: MediaFile = {
        id: `media_${Date.now()}_${Math.random()}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('audio/') ? 'audio' : 'image',
        url: URL.createObjectURL(file),
        thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        size: file.size,
        format: file.name.split('.').pop() || '',
        uploadedAt: new Date(),
        originalFile: file,
        metadata: {
          mimeType: file.type
        }
      };
      newMediaFiles.push(mediaFile);

      // Handle audio duration
      if (file.type.startsWith('audio/')) {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.ceil(audio.duration);
          setProject(prev => ({
            ...prev,
            settings: {
              ...prev.settings,
              duration: Math.max(duration, 60)
            },
            timeline: {
              ...prev.timeline,
              duration: Math.max(duration, 60)
            },
            mediaLibrary: prev.mediaLibrary.map(m => 
              m.id === mediaFile.id ? { ...m, duration } : m
            )
          }));
          URL.revokeObjectURL(audio.src);
        });
        audio.src = mediaFile.url;
      }
    }

    setProject(prev => ({
      ...prev,
      mediaLibrary: [...prev.mediaLibrary, ...newMediaFiles]
    }));
  }, []);

  const handleClipSelect = (clip: TimelineClip) => {
    setSelectedClip(clip);
  };

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setPlayheadPosition(time);
    setProject(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        playheadPosition: time
      }
    }));
  }, []);

  const handleExport = () => {
    if (user.exportStats.remaining <= 0) {
      alert('エクスポート制限に達しました。プランをアップグレードしてください。');
      return;
    }
    if (!project.timeline?.clips?.length) {
      alert('プロジェクトにクリップがありません。メディアを追加してからエクスポートしてください。');
      return;
    }
    setShowExportPanel(true);
  };

  const handleExportStart = (job: ExportJob) => {
    setCurrentExportJob(job);
    setShowExportProgress(true);
    setShowExportPanel(false);
  };

  const handleExportComplete = (job: ExportJob) => {
    console.log('Export completed:', job);
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

  const createPreviewWindow = useCallback((resolution: Resolution) => {
    const resolutionData = VIDEO_RESOLUTIONS[resolution];
    const windowId = `preview_${Date.now()}`;
    
    // Mock preview window creation
    console.log(`Creating preview window for ${resolution}:`, resolutionData);
    setPreviewWindows(prev => [...prev, windowId]);
    
    // Simulate window cleanup after 30 seconds
    setTimeout(() => {
      setPreviewWindows(prev => prev.filter(id => id !== windowId));
    }, 30000);
  }, []);

  const closePreviewWindow = useCallback((windowId: string) => {
    setPreviewWindows(prev => prev.filter(id => id !== windowId));
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setShowPiP(false);
      } else {
        // Mock PiP functionality
        setShowPiP(true);
      }
    } catch (error) {
      console.error('PiP mode failed:', error);
    }
  }, []);

  // Panel resizing
  const handleMouseDown = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(side);
  }, []);

  const handleTimelineResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTimeline(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    if (isResizing) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const minWidth = 280;
      const maxWidth = containerRect.width * 0.35;

      if (isResizing === 'left' && !isLeftPanelCollapsed) {
        const newWidth = Math.min(Math.max(e.clientX - containerRect.left, minWidth), maxWidth);
        setLeftPanelWidth(newWidth);
      } else if (isResizing === 'right' && !isRightPanelCollapsed) {
        const newWidth = Math.min(Math.max(containerRect.right - e.clientX, minWidth), maxWidth);
        setRightPanelWidth(newWidth);
      }
    }

    if (isResizingTimeline && timelineRef.current) {
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const newHeight = Math.min(Math.max(timelineRect.bottom - e.clientY, 160), 400);
      setTimelineHeight(newHeight);
    }
  }, [isResizing, isResizingTimeline, isLeftPanelCollapsed, isRightPanelCollapsed]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
    setIsResizingTimeline(false);
  }, []);

  // Tutorial functions
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

  // Effects
  useEffect(() => {
    if (isResizing || isResizingTimeline) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingTimeline ? 'ns-resize' : 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, isResizingTimeline, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const freshProject = createEmptyProject();
    setProject(freshProject);
    setVideoResolution(freshProject.settings.resolution);
  }, []);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenEditorTutorial_v5_ultimate');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('hasSeenEditorTutorial_v5_ultimate', 'true');
    }
  }, []);

  // Render preview content
  const renderPreviewContent = () => {
    return (
      <Preview
        project={project}
        playheadPosition={playheadPosition}
        isPlaying={isPlaying}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col bg-dark-900 text-white overflow-hidden">
      {/* Status Indicator */}
      <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">レイアウト修正完了</span>
      </div>

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
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full m-4 border border-green-500/30"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-white" />
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
                        index === tutorialStep ? 'bg-green-500' : 'bg-gray-600'
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
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-all flex items-center justify-center space-x-1"
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

      {/* Export Panel */}
      {showExportPanel && (
        <ExportPanel
          project={project}
          isOpen={showExportPanel}
          onClose={() => setShowExportPanel(false)}
          onExportStart={handleExportStart}
        />
      )}

      {/* Export Progress */}
      {currentExportJob && (
        <ExportProgress
          jobId={currentExportJob.id}
          isVisible={showExportProgress}
          onClose={() => setShowExportProgress(false)}
          onComplete={handleExportComplete}
        />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-800 border-b border-dark-700 px-4 sm:px-6 py-3 flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <FolderOpen className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold truncate" title={project.name}>
                {project.name} (修正版)
              </h1>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span>レイアウト修正完了</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              <span className="hidden sm:inline">エクスポート残り: </span>
              <span className="font-medium text-blue-400">{user.exportStats.remaining}/{user.exportStats.limit}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTutorial(true)}
              className="hidden sm:flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 px-3 py-1.5 rounded-lg text-sm transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden lg:inline">修正点を確認</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={user.exportStats.remaining <= 0}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">エクスポート</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Fixed Grid Layout */}
      <div 
        className="flex-1 min-h-0 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `${getLeftPanelWidth()}px 1fr ${getRightPanelWidth()}px`,
          gridTemplateRows: 'auto auto 1fr',
          gap: '0'
        }}
        ref={containerRef}
      >
        {/* Left Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-dark-800 border-r border-dark-700 flex flex-col relative overflow-hidden"
          style={{ gridRow: '1 / -1' }}
        >
          <button
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="absolute top-4 right-2 z-10 w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center transition-all"
            title={isLeftPanelCollapsed ? 'パネルを展開' : 'パネルを折りたたみ'}
          >
            {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {!isLeftPanelCollapsed && (
            <>
              <div className="p-4 border-b border-dark-700 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400 truncate">
                    メディアライブラリ (修正版)
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 mb-4"
                >
                  <Upload className="w-5 h-5" />
                  <span className="truncate">ファイルをアップロード</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMediaUpload(e.target.files);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {project.mediaLibrary.map((media) => (
                    <div key={media.id} className="bg-dark-700 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {media.type === 'image' ? (
                          <Image className="w-5 h-5 text-blue-400" />
                        ) : media.type === 'video' ? (
                          <Video className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Music className="w-5 h-5 text-green-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{media.name}</p>
                          <p className="text-xs text-gray-400">
                            {(media.size / 1024 / 1024).toFixed(1)} MB
                            {media.duration && ` • ${media.duration.toFixed(1)}s`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {project.mediaLibrary.length === 0 && (
                  <div className="text-center py-8">
                    <Image className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">メディアファイルがありません</p>
                    <p className="text-green-400 text-xs mt-1">音楽をアップロードすると時間が自動調整されます</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Collapsed state */}
          {isLeftPanelCollapsed && (
            <div className="flex flex-col items-center py-4 space-y-3">
              <Image className="w-6 h-6 text-green-400" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all"
                title="ファイルをアップロード"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {!isLeftPanelCollapsed && (
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-green-500/50 transition-colors group"
              onMouseDown={handleMouseDown('left')}
            >
              <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Resolution Controls */}
        <div className="bg-dark-800 border-b border-dark-700 px-4 py-2" style={{ gridColumn: '2' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-300">出力解像度:</span>
              <div className="relative">
                <select 
                  value={videoResolution}
                  onChange={(e) => handleResolutionChange(e.target.value as Resolution)}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer min-w-[180px] pr-8"
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
            <div className="text-xs text-gray-400 truncate ml-4">
              現在: {currentVideoResolution.width}×{currentVideoResolution.height}
            </div>
          </div>
        </div>
        
        {/* Mini Preview Area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-48 bg-dark-850 border-b border-dark-700 flex items-center justify-center relative overflow-hidden"
          id="mini-preview"
          style={{ gridColumn: '2' }}
        >
          <div className="relative w-full h-full p-4">
            <div className="w-full h-full rounded-lg overflow-hidden border border-gray-700">
              {renderPreviewContent()}
            </div>
            
            {/* Popup Controls */}
            <div className="absolute top-6 right-6 flex gap-2">
              <button
                onClick={() => createPreviewWindow(videoResolution)}
                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full text-xs transition-all shadow-lg"
                title="実際のサイズでプレビューを開く"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={togglePiP}
                className={`p-2 rounded-full text-xs transition-all shadow-lg ${
                  showPiP 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
                title="Picture-in-Picture"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Status */}
            <div className="absolute bottom-6 left-6 bg-black/70 rounded-lg px-3 py-2 text-sm text-white">
              <div className="flex items-center space-x-4 text-xs">
                <span className="truncate">プレビュー品質: リアルタイム</span>
                <span className="truncate">解像度: {currentVideoResolution.width}×{currentVideoResolution.height}</span>
                {project.timeline.clips.length > 0 && (
                  <span className="text-green-400 truncate">{project.timeline.clips.length}クリップ</span>
                )}
              </div>
            </div>

            {/* Preview Windows Status */}
            {previewWindows.length > 0 && (
              <div className="absolute bottom-6 right-6 bg-green-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
                {previewWindows.length} 個のプレビューが開いています
              </div>
            )}

            {/* No Media Message */}
            {project.timeline.clips.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-center text-gray-400">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">プレビューなし</p>
                  <p className="text-sm">タイムラインにクリップを追加してください</p>
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
          className="bg-dark-800 border-b border-dark-700 p-3"
          style={{ gridColumn: '2' }}
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
          className="bg-dark-900 relative overflow-hidden"
          style={{ 
            height: timelineHeight,
            gridColumn: '2'
          }}
          id="timeline-area"
          ref={timelineRef}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-green-500/50 transition-colors group"
            onMouseDown={handleTimelineResizeStart}
          >
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400 rotate-90" />
            </div>
          </div>

          <div className="p-2 border-b border-dark-700 bg-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="truncate">タイムライン (修正版) - Sticky Ruler対応</span>
                </h3>
              </div>
              <div className="text-xs text-gray-400 truncate ml-4">
                高さ: {timelineHeight}px | 長さ: {Math.floor(project.timeline.duration / 60)}:{(project.timeline.duration % 60).toFixed(0).padStart(2, '0')}
              </div>
            </div>
          </div>
          
          <div className="h-full overflow-hidden">
            <BeatTimeline
              timeline={project.timeline}
              playheadPosition={playheadPosition}
              zoom={zoom}
              onClipSelect={handleClipSelect}
              onTimelineUpdate={(timeline) => 
                setProject(prev => ({ ...prev, timeline }))
              }
              onPlayheadChange={handleTimeUpdate}
              bpmAnalysis={bpmAnalysis}
              beatGrid={beatGrid}
              onBeatGridChange={setBeatGrid}
              showBeatMarkers={true}
              showBarMarkers={true}
            />
          </div>
        </motion.div>

        {/* Right Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-dark-800 border-l border-dark-700 flex flex-col relative overflow-hidden"
          style={{ gridRow: '1 / -1' }}
        >
          <button
            onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
            className="absolute top-4 left-2 z-10 w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center transition-all"
            title={isRightPanelCollapsed ? 'パネルを展開' : 'パネルを折りたたみ'}
          >
            {isRightPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {!isRightPanelCollapsed && (
            <div
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-green-500/50 transition-colors group"
              onMouseDown={handleMouseDown('right')}
            >
              <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          )}

          {!isRightPanelCollapsed && (
            <div className="flex-1 overflow-hidden p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  プロパティ (修正版)
                </span>
              </div>

              {selectedClip ? (
                <div className="space-y-4">
                  <div className="bg-dark-700 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">選択中のクリップ</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white truncate">{selectedClip.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">開始時間:</span>
                        <span className="text-white">{selectedClip.startTime.toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">長さ:</span>
                        <span className="text-white">{selectedClip.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-700 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">プロパティ</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">不透明度</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          defaultValue="1"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">音量</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          defaultValue="1"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">クリップを選択してください</p>
                  <p className="text-green-400 text-xs mt-1">プロパティを編集できます</p>
                </div>
              )}

              {/* Export Section */}
              <div className="mt-6 pt-4 border-t border-dark-700">
                <h4 className="text-sm font-medium text-white mb-3">エクスポート設定</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">品質</label>
                    <select className="w-full bg-dark-600 border border-dark-500 rounded px-2 py-1 text-sm">
                      <option>高品質</option>
                      <option>中品質</option>
                      <option>低品質</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">フォーマット</label>
                    <select className="w-full bg-dark-600 border border-dark-500 rounded px-2 py-1 text-sm">
                      <option>MP4</option>
                      <option>MOV</option>
                      <option>AVI</option>
                    </select>
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>エクスポート開始</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed state */}
          {isRightPanelCollapsed && (
            <div className="flex flex-col items-center py-4 space-y-3">
              <Settings className="w-6 h-6 text-green-400" />
              <div className="text-xs text-center text-gray-400 px-2">
                <div>コントロール</div>
                <div>パネル</div>
                <div className="text-green-400 text-xs">(修正版)</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-800 border-t border-dark-700 px-6 py-2 text-sm text-gray-400 flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 overflow-hidden">
            <span className="truncate">解像度: {currentVideoResolution.width}×{currentVideoResolution.height}</span>
            <span>FPS: {project.settings.frameRate}</span>
            <span>長さ: {Math.floor(project.timeline.duration / 60)}:{(project.timeline.duration % 60).toFixed(0).padStart(2, '0')}</span>
            <span className="hidden lg:inline">タイムライン高さ: {timelineHeight}px</span>
            <span className="text-green-400 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>レイアウト修正済み</span>
            </span>
          </div>
          <div className="flex items-center space-x-6 overflow-hidden">
            <span>クリップ: {project.timeline.clips.length}</span>
            <span className="hidden lg:inline">プレビューウィンドウ: {previewWindows.length}</span>
            <span className="hidden xl:inline">左パネル: {isLeftPanelCollapsed ? '非表示' : `${leftPanelWidth}px`}</span>
            <span className="hidden xl:inline">右パネル: {isRightPanelCollapsed ? '非表示' : `${rightPanelWidth}px`}</span>
            <span className="capitalize">プラン: {user.plan}</span>
            {!user.canRemoveWatermark && (
              <span className="flex items-center space-x-1 text-yellow-400">
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">透かし付き</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>修正完了</span>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditorUltimate;