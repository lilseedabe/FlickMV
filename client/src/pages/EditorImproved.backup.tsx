import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';

// Components
import MediaLibrary from '../components/media/MediaLibrary';
import Timeline from '../components/timeline/Timeline';
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
  ChevronLeft,
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
  ExternalLink,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Camera,
  RotateCcw
} from 'lucide-react';

// Types
import type { Project, TimelineClip, MediaFile, Resolution } from '../types';

// PopupPreview Manager
class PreviewWindowManager {
  private windows: Map<string, Window> = new Map();
  private eventListeners: Map<string, () => void> = new Map();

  createWindow(config: {
    id: string;
    title: string;
    width: number;
    height: number;
    resolution: Resolution;
  }): Window | null {
    const { id, title, width, height } = config;
    
    const left = window.screenX + (window.outerWidth - width) / 2 + (this.windows.size * 30);
    const top = window.screenY + (window.outerHeight - height) / 2 + (this.windows.size * 30);

    const windowFeatures = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'scrollbars=no',
      'resizable=yes',
      'status=no',
      'directories=no',
      'location=no'
    ].join(',');

    try {
      const newWindow = window.open('', `preview_${id}`, windowFeatures);
      
      if (newWindow) {
        this.initializeWindow(newWindow, config);
        this.windows.set(id, newWindow);
        
        const cleanup = () => {
          this.windows.delete(id);
          this.eventListeners.delete(id);
        };
        
        newWindow.addEventListener('beforeunload', cleanup);
        this.eventListeners.set(id, cleanup);
        
        return newWindow;
      }
    } catch (error) {
      console.error('プレビューウィンドウの作成に失敗', error);
    }
    
    return null;
  }

  private initializeWindow(window: Window, config: any) {
    const doc = window.document;
    doc.title = `FlickMV Preview - ${config.title}`;
    
    doc.head.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #000; color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden; display: flex; flex-direction: column; height: 100vh;
        }
        .preview-header {
          background: #1a1a1a; padding: 8px 12px; border-bottom: 1px solid #333;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 12px; height: 32px;
        }
        .preview-title { color: #22c55e; font-weight: bold; }
        .preview-info { color: #888; }
        .preview-content {
          flex: 1; display: flex; align-items: center; justify-content: center;
          background: #000; position: relative;
        }
        .preview-video { max-width: 100%; max-height: 100%; border-radius: 4px; }
        .preview-placeholder {
          border: 2px dashed #444; border-radius: 8px; padding: 40px;
          text-align: center; color: #666;
        }
        .preview-controls {
          position: absolute; bottom: 16px; right: 16px;
          background: rgba(0,0,0,0.8); border-radius: 8px; padding: 8px;
          display: flex; gap: 8px;
        }
        .control-btn {
          background: #333; border: none; color: #fff; padding: 4px 8px;
          border-radius: 4px; font-size: 11px; cursor: pointer;
        }
        .control-btn:hover { background: #555; }
        .resolution-indicator {
          position: absolute; top: 16px; left: 16px;
          background: rgba(34, 197, 94, 0.9); color: white;
          padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;
        }
      </style>
    `;
    
    doc.body.innerHTML = `
      <div class="preview-header">
        <div class="preview-title">🎯 ${config.title}</div>
        <div class="preview-info">${config.resolution} プレビュー</div>
      </div>
      <div class="preview-content">
        <div id="preview-container">
          <div class="preview-placeholder">
            <div style="font-size: 48px; margin-bottom: 16px;">🎬</div>
            <div>プレビューを読み込み中...</div>
          </div>
        </div>
        <div class="resolution-indicator">${config.resolution}</div>
        <div class="preview-controls">
          <button class="control-btn" onclick="window.close()">✖ 閉じる</button>
          <button class="control-btn" onclick="toggleFullscreen()">⛶ フルスクリーン</button>
          <button class="control-btn" onclick="captureFrame()">📷 キャプチャ</button>
        </div>
      </div>
    `;
    
    (window as any).toggleFullscreen = () => {
      if (doc.fullscreenElement) {
        doc.exitFullscreen();
      } else {
        doc.documentElement.requestFullscreen();
      }
    };
    
    (window as any).captureFrame = () => {
      alert('フレームキャプチャ機能は開発中です');
    };
  }

  updatePreview(windowId: string, content: string) {
    const window = this.windows.get(windowId);
    if (!window) return;

    const container = window.document.getElementById('preview-container');
    if (container) {
      container.innerHTML = `
        <div class="preview-video" style="
          width: 100%; height: 100%; background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
          display: flex; align-items: center; justify-content: center;
          color: #22c55e; font-size: 16px; font-weight: bold;
        ">
          ${content}
        </div>
      `;
    }
  }

  closeWindow(windowId: string) {
    const window = this.windows.get(windowId);
    if (window) {
      window.close();
      this.windows.delete(windowId);
      
      const cleanup = this.eventListeners.get(windowId);
      if (cleanup) {
        cleanup();
        this.eventListeners.delete(windowId);
      }
    }
  }

  closeAllWindows() {
    this.windows.forEach((window, id) => {
      this.closeWindow(id);
    });
  }

  isWindowOpen(windowId: string): boolean {
    const window = this.windows.get(windowId);
    return window ? !window.closed : false;
  }
}

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

// シングルトンインスタンス
const previewManager = new PreviewWindowManager();

const EditorImproved: React.FC = () => {
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
  
  // Panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  
  // Timeline state
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  
  // Preview state
  const [videoResolution, setVideoResolution] = useState<Resolution>('9:16');
  const [previewWindows, setPreviewWindows] = useState<string[]>([]);
  const [showPiP, setShowPiP] = useState(false);
  
  // Mock user data
  const [user] = useState({
    id: 'user1',
    plan: 'free',
    canRemoveWatermark: false,
    exportStats: {
      currentMonth: 2,
      total: 15,
      limit: 5,
      remaining: 3
    }
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const currentVideoResolution = VIDEO_RESOLUTIONS[videoResolution];

  // Tutorial steps
  const tutorialSteps = [
    {
      title: "新しいワークフロー",
      description: "プレビューは別ウィンドウで確認し、メインでは快適なタイムライン編集が可能です",
      target: "timeline-area"
    },
    {
      title: "ポップアウトプレビュー", 
      description: "ミニプレビューのボタンから実際のサイズでプレビューウィンドウを開けます",
      target: "mini-preview"
    },
    {
      title: "タイムライン重視設計",
      description: "十分な高さとトラック数で、複雑な編集作業も快適に行えます",
      target: "timeline-area"
    }
  ];

  const currentTutorialStep = tutorialSteps[tutorialStep] ?? tutorialSteps[0];

  // Popup preview functions
  const createPreviewWindow = useCallback((resolution: Resolution) => {
    const resolutionData = VIDEO_RESOLUTIONS[resolution];
    const windowId = `preview_${Date.now()}`;
    
    const newWindow = previewManager.createWindow({
      id: windowId,
      title: resolutionData.label,
      width: resolutionData.windowSize.width,
      height: resolutionData.windowSize.height,
      resolution
    });

    if (newWindow) {
      setPreviewWindows(prev => [...prev, windowId]);
      
      // プレビュー内容を更新
      setTimeout(() => {
        previewManager.updatePreview(windowId, `
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">🎬</div>
            <div>動画プレビュー</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
              ${resolutionData.width} × ${resolutionData.height}
            </div>
          </div>
        `);
      }, 100);
    }
  }, []);

  const closePreviewWindow = useCallback((windowId: string) => {
    previewManager.closeWindow(windowId);
    setPreviewWindows(prev => prev.filter(id => id !== windowId));
  }, []);

  // Picture-in-Picture toggle
  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setShowPiP(false);
      } else {
        // PiP用の仮想ビデオ要素を作成
        const video = document.createElement('video');
        video.src = 'data:video/mp4;base64,'; // 空のビデオ
        video.muted = true;
        await video.requestPictureInPicture();
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
      const minWidth = 200;
      const maxWidth = containerRect.width * 0.4;

      if (isResizing === 'left') {
        const newWidth = Math.min(Math.max(e.clientX - containerRect.left, minWidth), maxWidth);
        setLeftPanelWidth(newWidth);
      } else if (isResizing === 'right') {
        const newWidth = Math.min(Math.max(containerRect.right - e.clientX, minWidth), maxWidth);
        setRightPanelWidth(newWidth);
      }
    }

    if (isResizingTimeline && timelineRef.current) {
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const newHeight = Math.min(Math.max(timelineRect.bottom - e.clientY, 120), 400);
      setTimelineHeight(newHeight);
    }
  }, [isResizing, isResizingTimeline]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
    setIsResizingTimeline(false);
  }, []);

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

  // Other handlers
  const handleMediaUpload = (mediaFiles: MediaFile[]) => {
    console.log('Uploaded media:', mediaFiles);
    setProject(prev => ({
      ...prev,
      mediaLibrary: [...prev.mediaLibrary, ...mediaFiles]
    }));
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
      alert('エクスポート制限に達しました。プランをアップグレードしてください');
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

  // Initialize
  useEffect(() => {
    const freshProject = createEmptyProject();
    setProject(freshProject);
    setVideoResolution(freshProject.settings.resolution);
  }, []);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenEditorTutorial_v2');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('hasSeenEditorTutorial_v2', 'true');
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      previewManager.closeAllWindows();
    };
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
                  <Sparkles className="w-6 h-6 text-white" />
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
                      {user.plan === 'pro' ? (
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
          animate={{ x: isLeftPanelCollapsed ? -leftPanelWidth + 48 : 0 }}
          className="bg-dark-800 border-r border-dark-700 flex flex-col relative"
          style={{ width: leftPanelWidth }}
        >
          {/* Collapse Button */}
          <button
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="absolute top-4 right-2 z-10 w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center transition-all"
          >
            {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {!isLeftPanelCollapsed && (
            <>
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
            </>
          )}

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
          {/* Resolution Controls */}
          <div className="bg-dark-800 border-b border-dark-700 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-300">出力解像度:</span>
                <div className="relative">
                  <select 
                    value={videoResolution}
                    onChange={(e) => handleResolutionChange(e.target.value as Resolution)}
                    className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer min-w-[200px]"
                  >
                    {Object.entries(VIDEO_RESOLUTIONS).map(([key, resolution]) => (
                      <option key={key} value={key}>
                        {resolution.label} - {resolution.width}×{resolution.height}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="text-xs text-gray-400">
                現在: {currentVideoResolution.width}×{currentVideoResolution.height}
              </div>
            </div>
          </div>
          
          {/* Mini Preview Area */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-32 bg-dark-850 border-b border-dark-700 flex items-center justify-center relative"
            id="mini-preview"
          >
            <div className="relative">
              <div 
                className="bg-black rounded-lg border border-gray-700 flex items-center justify-center text-gray-400 text-sm relative"
                style={{ width: '120px', height: '68px' }}
              >
                ミニプレビュー
              </div>
              
              {/* Popup Controls */}
              <div className="absolute -top-2 -right-2 flex gap-1">
                <button
                  onClick={() => createPreviewWindow(videoResolution)}
                  className="bg-purple-500 hover:bg-purple-600 text-white p-1.5 rounded-full text-xs transition-all shadow-lg"
                  title="実際のサイズでプレビューを開く"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={togglePiP}
                  className={`p-1.5 rounded-full text-xs transition-all shadow-lg ${
                    showPiP 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                  title="Picture-in-Picture"
                >
                  <PictureInPicture2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick Resolution Buttons */}
            <div className="absolute top-2 left-2 flex gap-1">
              {Object.entries(VIDEO_RESOLUTIONS)
                .filter(([key]) => ['9:16', '16:9', '1:1'].includes(key))
                .map(([resolution, resData]) => {
                const Icon = resData.icon;
                return (
                  <button
                    key={resolution}
                    onClick={() => createPreviewWindow(resolution as Resolution)}
                    className="bg-dark-700/90 hover:bg-dark-600 backdrop-blur-sm border border-dark-600 p-1.5 rounded text-xs transition-all"
                    title={`${resData.label}でプレビューを開く`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                );
              })}
            </div>

            {/* Preview Windows Status */}
            {previewWindows.length > 0 && (
              <div className="absolute bottom-2 right-2 bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs">
                {previewWindows.length} 個のプレビューが開いています
              </div>
            )}
          </motion.div>

          {/* Playback Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800 border-b border-dark-700 p-3"
          >
            <PlaybackControls
              isPlaying={isPlaying}
              currentTime={playheadPosition}
              duration={project.timeline.duration}
              onPlayPause={handlePlayPause}
              onTimeChange={handleTimeUpdate}
            />
          </motion.div>

          {/* Timeline Area - 高さ調整可能 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-900 relative"
            style={{ height: timelineHeight }}
            id="timeline-area"
            ref={timelineRef}
          >
            {/* Timeline Resize Handle */}
            <div
              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-purple-500/50 transition-colors group"
              onMouseDown={handleTimelineResizeStart}
            >
              <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-gray-400 rotate-90" />
              </div>
            </div>

            <div className="p-2 border-b border-dark-700 bg-dark-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-400" />
                  タイムライン - 高さ調整可能
                </h3>
                <div className="text-xs text-gray-400">
                  高さ: {timelineHeight}px | ドラッグで調整
                </div>
              </div>
            </div>
            
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

        {/* Right Panel - Simplified Properties */}
        <motion.div
          initial={{ x: 300 }}
          animate={{ x: isRightPanelCollapsed ? rightPanelWidth - 48 : 0 }}
          className="bg-dark-800 border-l border-dark-700 flex flex-col relative"
          style={{ width: rightPanelWidth }}
        >
          {/* Collapse Button */}
          <button
            onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
            className="absolute top-4 left-2 z-10 w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center transition-all"
          >
            {isRightPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Right Resize Handle */}
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-purple-500/50 transition-colors group"
            onMouseDown={handleMouseDown('right')}
          >
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {!isRightPanelCollapsed && (
            <>
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>プロパティ</span>
                </h2>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {/* Preview Windows Management */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">プレビューウィンドウ</h3>
                  <div className="space-y-2">
                    {Object.entries(VIDEO_RESOLUTIONS).map(([key, resolution]) => (
                      <button
                        key={key}
                        onClick={() => createPreviewWindow(key as Resolution)}
                        className="w-full bg-dark-700 hover:bg-dark-600 text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <resolution.icon className="w-4 h-4" />
                          {resolution.label}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Windows */}
                {previewWindows.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">アクティブウィンドウ</h3>
                    <div className="space-y-2">
                      {previewWindows.map((windowId, index) => (
                        <div
                          key={windowId}
                          className="flex items-center justify-between bg-dark-700 px-3 py-2 rounded-lg"
                        >
                          <span className="text-sm text-gray-300">プレビュー {index + 1}</span>
                          <button
                            onClick={() => closePreviewWindow(windowId)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">解像度</label>
                    <select 
                      value={videoResolution}
                      onChange={(e) => handleResolutionChange(e.target.value as Resolution)}
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
                    <label className="block text-sm font-medium mb-2">エクスポート品質</label>
                    <select className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm">
                      <option>高品質</option>
                      <option>標準</option>
                      <option>圧縮</option>
                    </select>
                  </div>
                </div>

                {!selectedClip && (
                  <div className="mt-8 text-center text-gray-400">
                    <Info className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">クリップを選択してプロパティを編集</p>
                  </div>
                )}
              </div>
            </>
          )}
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
            <span>タイムライン高さ: {timelineHeight}px</span>
          </div>
          <div className="flex items-center space-x-6">
            <span>クリップ: {project.timeline.clips.length}</span>
            <span>プレビューウィンドウ: {previewWindows.length}</span>
            <span className="capitalize">プラン: {user.plan}</span>
            {!user.canRemoveWatermark && (
              <span className="flex items-center space-x-1 text-yellow-400">
                <Lock className="w-3 h-3" />
                <span>透かし付き</span>
              </span>
            )}
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

export default EditorImproved;