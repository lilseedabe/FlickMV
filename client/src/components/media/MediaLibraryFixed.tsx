import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Image,
  Video,
  Music,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Download,
  Trash2,
  Eye,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  LayoutGrid,
  List,
  Volume2,
  Clock,
  FileText
} from 'lucide-react';
import type { MediaFile, MediaType, MediaLibraryProps } from '@/types';
import { processMediaFile, validateFile } from '../../utils/media/mediaProcessor';

/**
 * 改良版メディアライブラリ - レイアウト問題修正版
 * - Better text overflow handling with ellipsis and tooltips
 * - Improved responsive grid layout
 * - Enhanced file display with proper sizing
 * - Better audio playback controls
 * - Improved error and progress display
 */
const MediaLibraryFixed: React.FC<MediaLibraryProps> = ({ 
  mediaFiles, 
  onUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [processingFiles, setProcessingFiles] = useState<Map<string, number>>(new Map());
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  
  // 音楽再生の状態管理
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // ファイル処理とアップロード
  const processAndUploadFiles = useCallback(async (files: File[]) => {
    const newProcessingFiles = new Map(processingFiles);
    const processedFiles: MediaFile[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${file.name}_${file.size}_${Date.now()}`;
      
      try {
        const validation = validateFile(file);
        if (!validation.isValid) {
          errors.push(`${file.name}: ${validation.error}`);
          continue;
        }
        
        if (validation.warnings) {
          validation.warnings.forEach(warning => {
            console.warn(`${file.name}: ${warning}`);
          });
        }
        
        newProcessingFiles.set(fileId, 0);
        setProcessingFiles(new Map(newProcessingFiles));
        
        const updateProgress = (progress: number) => {
          newProcessingFiles.set(fileId, progress);
          setProcessingFiles(new Map(newProcessingFiles));
        };
        
        updateProgress(20);
        
        const mediaFile = await processMediaFile(file);
        updateProgress(80);
        
        processedFiles.push(mediaFile);
        updateProgress(100);
        
        setTimeout(() => {
          const currentProcessing = new Map(processingFiles);
          currentProcessing.delete(fileId);
          setProcessingFiles(currentProcessing);
        }, 1000);
        
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        errors.push(`${file.name}: 処理に失敗しました`);
        newProcessingFiles.delete(fileId);
      }
    }
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      setTimeout(() => setUploadErrors([]), 5000);
    }
    
    if (processedFiles.length > 0) {
      onUpload(processedFiles);
    }
    
    setProcessingFiles(new Map());
  }, [onUpload, processingFiles]);

  // File drop handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    processAndUploadFiles(acceptedFiles);
  }, [processAndUploadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
      'video/*': ['.mp4', '.mov', '.webm', '.avi'],
      'audio/*': ['.mp3', '.wav', '.aac', '.ogg', '.m4a']
    },
    multiple: true,
    maxSize: 100 * 1024 * 1024
  });

  // Filter and search media files
  const filteredFiles = mediaFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatResolution = (width?: number, height?: number) => {
    if (!width || !height) return '';
    
    const resolutionNames: Record<string, string> = {
      '1920x1080': 'Full HD',
      '1280x720': 'HD',
      '3840x2160': '4K',
      '1080x1920': 'Vertical HD',
      '1080x1080': 'Square'
    };
    
    const key = `${width}x${height}`;
    return resolutionNames[key] || `${width}×${height}`;
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      default:
        return <Image className="w-4 h-4" />;
    }
  };

  // 音楽再生機能：改良版
  const playAudio = useCallback((file: MediaFile) => {
    if (!file.url || file.type !== 'audio') {
      console.warn('再生不可能なファイル:', file);
      return;
    }
    
    try {
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
        if (audioRef.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.src);
        }
      }
      
      if (currentlyPlaying === file.id) {
        setCurrentlyPlaying(null);
        setAudioRef(null);
        return;
      }
      
      let audioSrc: string;
      
      if (file.originalFile && file.originalFile instanceof File) {
        audioSrc = URL.createObjectURL(file.originalFile);
        console.log('📁 原始Fileオブジェクトで音楽再生:', file.name);
      } else {
        audioSrc = file.url;
        console.log('🌐 URLで音楽再生:', file.name);
      }
      
      const audio = new Audio();
      audio.volume = 0.5;
      audio.preload = 'auto';
      
      audio.addEventListener('loadeddata', () => {
        console.log('📊 音楽データ読み込み完了:', file.name);
        audio.play().then(() => {
          setCurrentlyPlaying(file.id);
          setAudioRef(audio);
          console.log(`🎵 音楽再生開始: ${file.name}`);
        }).catch((playError) => {
          console.error('再生失敗:', playError);
          if (audioSrc.startsWith('blob:')) {
            URL.revokeObjectURL(audioSrc);
          }
          setCurrentlyPlaying(null);
          setAudioRef(null);
        });
      }, { once: true });
      
      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        setAudioRef(null);
        if (audioSrc.startsWith('blob:')) {
          URL.revokeObjectURL(audioSrc);
        }
        console.log(`✓ 音楽再生終了: ${file.name}`);
      });
      
      audio.addEventListener('error', (e) => {
        console.error(`❌ 音楽再生エラー: ${file.name}`, e);
        setCurrentlyPlaying(null);
        setAudioRef(null);
        if (audioSrc.startsWith('blob:')) {
          URL.revokeObjectURL(audioSrc);
        }
        console.warn('音楽ファイルの再生に失敗しました。ファイル形式をご確認ください。');
      });
      
      audio.src = audioSrc;
      audio.load();
      
    } catch (error) {
      console.error('音楽再生初期化エラー:', error);
      setCurrentlyPlaying(null);
      setAudioRef(null);
    }
  }, [currentlyPlaying, audioRef]);
  
  React.useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
    };
  }, [audioRef]);

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter - 改良版 */}
      <div className="p-3 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-dark-400 w-3 h-3" />
          <input
            type="text"
            placeholder="Search media..."
            className="w-full pl-7 pr-2 py-1.5 bg-dark-700 border border-dark-600 rounded text-white text-xs placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <select 
            className="flex-1 px-2 py-1.5 bg-dark-700 border border-dark-600 rounded text-white text-xs focus:border-primary-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MediaType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
          
          <button 
            className="p-1.5 hover:bg-dark-600 rounded transition-colors"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'リスト表示に切り替え' : 'グリッド表示に切り替え'}
          >
            {viewMode === 'grid' ? <List className="w-3 h-3 text-dark-400" /> : <LayoutGrid className="w-3 h-3 text-dark-400" />}
          </button>
        </div>
      </div>

      {/* Upload Area - 改良版 */}
      <div className="px-3 mb-3 flex-shrink-0">
        {/* エラー表示 - 改良版 */}
        <AnimatePresence>
          {uploadErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded"
            >
              <div className="flex items-center space-x-2 mb-1">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">アップロードエラー</span>
              </div>
              <div className="space-y-0.5 max-h-16 overflow-y-auto scrollbar-thin">
                {uploadErrors.map((error, index) => (
                  <p key={index} className="text-xs text-red-300 truncate" title={error}>{error}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 進捗表示 - 改良版 */}
        <AnimatePresence>
          {processingFiles.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-xs font-medium text-blue-400">ファイルを処理中...</span>
              </div>
              <div className="space-y-1.5 max-h-20 overflow-y-auto scrollbar-thin">
                {Array.from(processingFiles.entries()).map(([fileId, progress]) => (
                  <div key={fileId}>
                    <div className="flex justify-between text-xs text-blue-300 mb-0.5">
                      <span className="truncate flex-1" title={fileId.split('_')[0]}>
                        {fileId.split('_')[0]}
                      </span>
                      <span className="ml-2">{progress}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary-400 bg-primary-400/10'
              : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 text-dark-400 mx-auto mb-1" />
          <p className="text-xs text-dark-300 mb-0.5">
            {isDragActive ? 'Drop files here' : 'Drag & drop files'}
          </p>
          <p className="text-xs text-dark-500">
            or click to browse • Max 100MB per file
          </p>
          <p className="text-xs text-dark-500 mt-0.5">
            Supports: JPG, PNG, MP4, WebM, MP3, WAV
          </p>
        </div>
      </div>

      {/* Media Files - 改良版 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        <AnimatePresence>
          {filteredFiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-2">
                {getMediaIcon('image')}
              </div>
              <p className="text-sm text-dark-400 mb-1">No media files</p>
              <p className="text-xs text-dark-500">Upload some files to get started</p>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -1 }}
                  className="bg-dark-700 rounded overflow-hidden group cursor-pointer"
                  draggable
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'media',
                      data: file
                    }));
                  }}
                >
                  {/* Thumbnail - 改良版 */}
                  <div className="relative aspect-square bg-dark-600">
                    {file.type === 'image' && file.thumbnail && (
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    {file.type === 'video' && (
                      <div className="w-full h-full relative">
                        {file.thumbnail ? (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-6 h-6 text-dark-400" />
                          </div>
                        )}
                      </div>
                    )}
                    {file.type === 'audio' && (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-blue-600/20">
                        <div className="text-center">
                          <Music className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                          <div className="text-xs text-purple-300 px-2 truncate" title={file.name}>
                            {file.name.split('.')[0]}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay - 改良版 */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex space-x-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (file.type === 'audio') {
                              playAudio(file);
                            }
                          }}
                          className={`p-1.5 rounded-full transition-colors ${
                            file.type === 'audio' && currentlyPlaying === file.id 
                              ? 'bg-green-500/90 hover:bg-green-600/90' 
                              : 'bg-white/20 hover:bg-white/30'
                          }`}
                          title={file.type === 'audio' ? 
                            (currentlyPlaying === file.id ? '音楽を停止' : '音楽を再生') : 
                            'プレビュー'
                          }
                        >
                          {file.type === 'audio' && currentlyPlaying === file.id ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </button>
                        <button 
                          className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                          title="詳細を表示"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Type Icon */}
                    <div className="absolute top-1 left-1 p-0.5 bg-black/50 rounded">
                      {getMediaIcon(file.type)}
                    </div>
                    
                    {/* Resolution indicator */}
                    {(file.width && file.height) && (
                      <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/70 rounded text-xs truncate max-w-[60px]" title={formatResolution(file.width, file.height)}>
                        {formatResolution(file.width, file.height)}
                      </div>
                    )}

                    {/* Duration (for video/audio) */}
                    {file.duration && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-xs flex items-center space-x-0.5" title={`Duration: ${formatDuration(file.duration)}`}>
                        <Clock className="w-2 h-2" />
                        <span>{formatDuration(file.duration)}</span>
                      </div>
                    )}

                    {/* Audio playing indicator */}
                    {file.type === 'audio' && currentlyPlaying === file.id && (
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-green-500/90 rounded text-xs flex items-center space-x-0.5 animate-pulse">
                        <Volume2 className="w-2 h-2" />
                        <span>Playing</span>
                      </div>
                    )}
                  </div>

                  {/* File Info - 改良版 */}
                  <div className="p-2">
                    <p className="text-xs font-medium text-white truncate mb-1" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                        <span className="text-xs text-dark-400 truncate" title={formatFileSize(file.size)}>
                          {formatFileSize(file.size)}
                        </span>
                        {(file.width && file.height) && (
                          <span className="text-xs text-dark-500 truncate" title={formatResolution(file.width, file.height)}>
                            {formatResolution(file.width, file.height)}
                          </span>
                        )}
                      </div>
                      <button className="p-0.5 hover:bg-dark-600 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <MoreVertical className="w-3 h-3 text-dark-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center p-2 bg-dark-700 rounded hover:bg-dark-600 transition-colors group cursor-pointer"
                  draggable
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'media',
                      data: file
                    }));
                  }}
                >
                  <div className="w-8 h-8 bg-dark-600 rounded flex items-center justify-center mr-2 flex-shrink-0">
                    {getMediaIcon(file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-dark-400">
                      <span title={formatFileSize(file.size)}>{formatFileSize(file.size)}</span>
                      {file.duration && (
                        <>
                          <span>•</span>
                          <span title={`Duration: ${formatDuration(file.duration)}`} className="flex items-center space-x-0.5">
                            <Clock className="w-2 h-2" />
                            <span>{formatDuration(file.duration)}</span>
                          </span>
                        </>
                      )}
                      {(file.width && file.height) && (
                        <>
                          <span>•</span>
                          <span title={formatResolution(file.width, file.height)}>{formatResolution(file.width, file.height)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (file.type === 'audio') {
                          playAudio(file);
                        }
                      }}
                      className={`p-1 rounded transition-colors ${
                        file.type === 'audio' && currentlyPlaying === file.id
                          ? 'bg-green-500 text-white'
                          : 'hover:bg-dark-500'
                      }`}
                      title={file.type === 'audio' ? 
                        (currentlyPlaying === file.id ? '音楽を停止' : '音楽を再生') : 
                        'プレビュー'
                      }
                    >
                      {file.type === 'audio' && currentlyPlaying === file.id ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                    <button className="p-1 hover:bg-dark-500 rounded" title="ダウンロード">
                      <Download className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:bg-red-500 rounded text-red-400" title="削除">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Playing indicator for list view */}
                  {file.type === 'audio' && currentlyPlaying === file.id && (
                    <div className="ml-2 flex items-center space-x-1 text-green-400 text-xs">
                      <Volume2 className="w-3 h-3 animate-pulse" />
                      <span>Playing</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { MediaLibraryFixed };
export default MediaLibraryFixed;