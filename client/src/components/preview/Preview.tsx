import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const [loadedMedia, setLoadedMedia] = useState<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());

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

  // メディアファイル読み込み（改良版）
  const loadMediaFile = useCallback(async (mediaFile: any): Promise<HTMLImageElement | HTMLVideoElement | null> => {
    if (loadedMedia.has(mediaFile.id)) {
      return loadedMedia.get(mediaFile.id) || null;
    }

    try {
      if (mediaFile.type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('読み込みタイムアウト'));
          }, 5000);
          
          img.onload = () => {
            clearTimeout(timeoutId);
            setLoadedMedia(prev => new Map(prev).set(mediaFile.id, img));
            console.log('✅ 画像読み込み成功:', mediaFile.name);
            resolve(img);
          };
          
          img.onerror = (error) => {
            clearTimeout(timeoutId);
            console.error('❌ 画像読み込み失敗', mediaFile.name, error);
            reject(error);
          };
          
          // originalFileがある場合、新しいBlob URLを作成
          if (mediaFile.originalFile && mediaFile.originalFile instanceof File) {
            try {
              const blobUrl = URL.createObjectURL(mediaFile.originalFile);
              img.src = blobUrl;
              
              // 読み込み完了時にBlob URLをクリーンアップ
              img.onload = () => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(blobUrl);
                setLoadedMedia(prev => new Map(prev).set(mediaFile.id, img));
                console.log('✅ 画像読み込み成功（originalFile）:', mediaFile.name);
                resolve(img);
              };
              
              img.onerror = (error) => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(blobUrl);
                console.error('❌ 画像読み込み失敗（originalFile）', mediaFile.name, error);
                reject(error);
              };
            } catch (blobError) {
              console.error('❌ Blob URL作成失敗', mediaFile.name, blobError);
              // フォールバックで元のURLを使用
              img.src = mediaFile.url;
            }
          } else {
            // originalFileがない場合は元のURLを使用
            img.src = mediaFile.url;
          }
        });
      } else if (mediaFile.type === 'video') {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';
        
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('動画読み込みタイムアウト'));
          }, 10000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeoutId);
            setLoadedMedia(prev => new Map(prev).set(mediaFile.id, video));
            console.log('✅ 動画読み込み成功:', mediaFile.name);
            resolve(video);
          };
          
          video.onerror = (error) => {
            clearTimeout(timeoutId);
            console.error('❌ 動画読み込み失敗', mediaFile.name, error);
            reject(error);
          };
          
          // originalFileがある場合、新しいBlob URLを作成
          if (mediaFile.originalFile && mediaFile.originalFile instanceof File) {
            try {
              const blobUrl = URL.createObjectURL(mediaFile.originalFile);
              video.src = blobUrl;
              
              // 読み込み完了時にBlob URLをクリーンアップ
              video.onloadedmetadata = () => {
                clearTimeout(timeoutId);
                setLoadedMedia(prev => new Map(prev).set(mediaFile.id, video));
                console.log('✅ 動画読み込み成功（originalFile）:', mediaFile.name);
                resolve(video);
              };
              
              video.onerror = (error) => {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(blobUrl);
                console.error('❌ 動画読み込み失敗（originalFile）', mediaFile.name, error);
                reject(error);
              };
            } catch (blobError) {
              console.error('❌ Blob URL作成失敗', mediaFile.name, blobError);
              // フォールバックで元のURLを使用
              video.src = mediaFile.url;
            }
          } else {
            // originalFileがない場合は元のURLを使用
            video.src = mediaFile.url;
          }
        });
      }
    } catch (error) {
      console.error('メディアファイル読み込みエラー:', mediaFile.name, error);
      return null;
    }

    return null;
  }, [loadedMedia]);

  // 現在のフレームをレンダリング（改良版）
  useEffect(() => {
    let isMounted = true;
    
    const renderFrame = async () => {
      if (!isMounted) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // キャンバスサイズ設定
      canvas.width = resolution.width;
      canvas.height = resolution.height;

      // キャンバスをクリア
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 現在時刻でアクティブなクリップを検索
      const activeClips = project.timeline.clips.filter(clip => 
        playheadPosition >= clip.startTime && 
        playheadPosition < clip.startTime + clip.duration
      );

      // レイヤー順でソート（下から上へ）
      activeClips.sort((a, b) => a.layer - b.layer);

      // クリップをレンダリング
      for (const clip of activeClips) {
        if (!isMounted) break;
        
        const mediaFile = project.mediaLibrary.find(m => m.id === clip.mediaId);
        if (!mediaFile) continue;

        const clipProgress = (playheadPosition - clip.startTime) / clip.duration;
        
        try {
          if (mediaFile.type === 'image') {
            await renderImageClip(ctx, mediaFile, clip, clipProgress);
          } else if (mediaFile.type === 'video') {
            await renderVideoClip(ctx, mediaFile, clip, clipProgress);
          }
        } catch (error) {
          console.error('クリップレンダリングエラー:', clip.id, error);
          // エラー時のフォールバック表示
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(0, 0, ctx.canvas.width / 4, ctx.canvas.height / 4);
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('エラー', ctx.canvas.width / 8, ctx.canvas.height / 8);
        }
      }

      // テキストオーバーレイを追加
      if (isMounted) {
        renderTextOverlays(ctx);
      }
    };

    renderFrame().catch(error => {
      console.error('フレームレンダリングエラー:', error);
    });
    
    return () => {
      isMounted = false;
    };
  }, [playheadPosition, project, resolution, loadedMedia]);
  
  // コンポーネントクリーンアップ
  useEffect(() => {
    return () => {
      // ロードされたメディアのクリーンアップ
      loadedMedia.forEach((media, id) => {
        if (media instanceof HTMLVideoElement) {
          media.pause();
          media.src = '';
          media.load();
        }
        console.log('🧹 メディアクリーンアップ:', id);
      });
      setLoadedMedia(new Map());
    };
  }, []);

  const renderImageClip = async (
    ctx: CanvasRenderingContext2D, 
    mediaFile: any, 
    clip: any, 
    progress: number
  ) => {
    try {
      const img = await loadMediaFile(mediaFile) as HTMLImageElement;
      
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        
        // Ken Burnsエフェクトを適用（有効な場合）
        const panZoomEffect = clip.effects?.find((e: any) => e.type === 'pan_zoom');
        if (panZoomEffect && panZoomEffect.enabled) {
          const { zoom = 1.1, panX = 0, panY = 0 } = panZoomEffect.parameters;
          const currentZoom = 1 + (zoom - 1) * progress;
          const currentPanX = panX * progress * ctx.canvas.width;
          const currentPanY = panY * progress * ctx.canvas.height;
          
          ctx.scale(currentZoom, currentZoom);
          ctx.translate(currentPanX / currentZoom, currentPanY / currentZoom);
          
          // キャンバスにフィットするスケールを計算
          const scaleX = ctx.canvas.width / currentZoom / img.width;
          const scaleY = ctx.canvas.height / currentZoom / img.height;
          const scale = Math.max(scaleX, scaleY); // キャンバスをカバー
          
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const drawX = (ctx.canvas.width / currentZoom - drawWidth) / 2;
          const drawY = (ctx.canvas.height / currentZoom - drawHeight) / 2;
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        } else {
          // 標準フィット
          const scaleX = ctx.canvas.width / img.width;
          const scaleY = ctx.canvas.height / img.height;
          const scale = Math.max(scaleX, scaleY);
          
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const drawX = (ctx.canvas.width - drawWidth) / 2;
          const drawY = (ctx.canvas.height - drawHeight) / 2;
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        }
        
        ctx.restore();
      } else {
        // フォールバック: 色付き矩形
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
        const colorIndex = parseInt(clip.id.slice(-1)) % colors.length;
        ctx.fillStyle = colors[colorIndex];
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // 読み込みステータス
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('画像を読み込み中...', ctx.canvas.width / 2, ctx.canvas.height / 2);
      }
    } catch (error) {
      console.error('画像クリップレンダリングエラー:', mediaFile.name, error);
      // エラーフォールバック
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('画像の読み込みに失敗', ctx.canvas.width / 2, ctx.canvas.height / 2 - 10);
      ctx.font = '14px Arial';
      ctx.fillText(mediaFile.name || '不明なファイル', ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
    }
  };

  const renderVideoClip = async (
    ctx: CanvasRenderingContext2D, 
    mediaFile: any, 
    clip: any, 
    progress: number
  ) => {
    try {
      const video = await loadMediaFile(mediaFile) as HTMLVideoElement;
      
      if (video && video.readyState >= 2 && video.videoWidth > 0) { // HAVE_CURRENT_DATA
        // クリップの進行状況に基づいてビデオ時間を設定
        const videoTime = (clip.trimStart || 0) + progress * clip.duration;
        const normalizedTime = Math.min(videoTime, video.duration - 0.1);
        
        // ビデオの現在時間を設定（安全に）
        if (Math.abs(video.currentTime - normalizedTime) > 0.5) {
          try {
            video.currentTime = normalizedTime;
          } catch (timeError) {
            console.warn('ビデオ時間設定エラー:', timeError);
          }
        }
        
        // ビデオフレームを描画
        const scaleX = ctx.canvas.width / video.videoWidth;
        const scaleY = ctx.canvas.height / video.videoHeight;
        const scale = Math.max(scaleX, scaleY);
        
        const drawWidth = video.videoWidth * scale;
        const drawHeight = video.videoHeight * scale;
        const drawX = (ctx.canvas.width - drawWidth) / 2;
        const drawY = (ctx.canvas.height - drawHeight) / 2;
        
        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        
        // ビデオ用プログレスバー
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const barWidth = ctx.canvas.width * progress;
        ctx.fillRect(0, ctx.canvas.height - 10, barWidth, 10);
        
        // ビデオ情報表示
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 120, 60);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Time: ${normalizedTime.toFixed(1)}s`, 15, 25);
        ctx.fillText(`Duration: ${video.duration.toFixed(1)}s`, 15, 40);
        ctx.fillText(`Progress: ${(progress * 100).toFixed(0)}%`, 15, 55);
      } else {
        // フォールバック: グラデーション
        const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // 読み込みステータス
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('動画を読み込み中...', ctx.canvas.width / 2, ctx.canvas.height / 2);
        
        // ビデオ状態情報
        if (video) {
          ctx.font = '14px Arial';
          ctx.fillText(`ReadyState: ${video.readyState}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
          ctx.fillText(`VideoWidth: ${video.videoWidth}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 50);
        }
      }
    } catch (error) {
      console.error('動画クリップレンダリングエラー:', mediaFile.name, error);
      // エラーフォールバック
      ctx.fillStyle = '#cc2936';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('動画の読み込みに失敗', ctx.canvas.width / 2, ctx.canvas.height / 2 - 10);
      ctx.font = '14px Arial';
      ctx.fillText(mediaFile.name || '不明なファイル', ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
    }
  };

  const renderTextOverlays = (ctx: CanvasRenderingContext2D) => {
    // Render any text overlays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FlickMV Preview', ctx.canvas.width / 2, 50);
    
    // Time display
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const timeText = `${Math.floor(playheadPosition / 60)}:${(playheadPosition % 60).toFixed(1).padStart(4, '0')}`;
    ctx.fillText(timeText, ctx.canvas.width / 2, ctx.canvas.height - 30);
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
          <div className="text-xs text-green-400">
            クリップ: {project.timeline.clips.length}
          </div>
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
