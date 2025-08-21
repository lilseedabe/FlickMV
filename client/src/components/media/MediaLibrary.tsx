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
  Download,
  Trash2,
  Eye,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { MediaFile, MediaType, MediaLibraryProps } from '@/types';
import { processMediaFile, validateFile } from '../../utils/media/mediaProcessor';

const MediaLibrary: React.FC<MediaLibraryProps> = ({ 
  mediaFiles, 
  onUpload, 
  onAudioAnalyze 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [processingFiles, setProcessingFiles] = useState<Map<string, number>>(new Map());
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // ファイル処理とアップロード
  const processAndUploadFiles = useCallback(async (files: File[]) => {
    const newProcessingFiles = new Map(processingFiles);
    const processedFiles: MediaFile[] = [];
    const errors: string[] = [];
    
    // 各ファイルを処理
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${file.name}_${file.size}_${Date.now()}`;
      
      try {
        // ファイル検証
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
        
        // 進捗表示開始
        newProcessingFiles.set(fileId, 0);
        setProcessingFiles(new Map(newProcessingFiles));
        
        // 進捗更新シミュレーション
        const updateProgress = (progress: number) => {
          newProcessingFiles.set(fileId, progress);
          setProcessingFiles(new Map(newProcessingFiles));
        };
        
        updateProgress(20);
        
        // メディアファイル処理
        const mediaFile = await processMediaFile(file);
        updateProgress(80);
        
        processedFiles.push(mediaFile);
        updateProgress(100);
        
        // 完了後に進捗を削除
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
    
    // エラーを表示
    if (errors.length > 0) {
      setUploadErrors(errors);
      setTimeout(() => setUploadErrors([]), 5000);
    }
    
    // 処理済みファイルをコールバック
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
    maxSize: 100 * 1024 * 1024 // 100MB制限
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

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search media..."
            className="w-full pl-9 pr-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <select 
            className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MediaType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
          
          <button 
            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Filter className="w-4 h-4 text-dark-400" />
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="px-4 mb-4">
        {/* エラー表示 */}
        <AnimatePresence>
          {uploadErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">アップロードエラー</span>
              </div>
              <div className="space-y-1">
                {uploadErrors.map((error, index) => (
                  <p key={index} className="text-xs text-red-300">{error}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 進捗表示 */}
        <AnimatePresence>
          {processingFiles.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-3">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm font-medium text-blue-400">ファイルを処理中...</span>
              </div>
              <div className="space-y-2">
                {Array.from(processingFiles.entries()).map(([fileId, progress]) => (
                  <div key={fileId}>
                    <div className="flex justify-between text-xs text-blue-300 mb-1">
                      <span>{fileId.split('_')[0]}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary-400 bg-primary-400/10'
              : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-dark-400 mx-auto mb-2" />
          <p className="text-sm text-dark-300 mb-1">
            {isDragActive ? 'Drop files here' : 'Drag & drop files'}
          </p>
          <p className="text-xs text-dark-500">
            or click to browse • Max 100MB per file
          </p>
          <p className="text-xs text-dark-500 mt-1">
            Supports: JPG, PNG, MP4, WebM, MP3, WAV
          </p>
        </div>
      </div>

      {/* Media Files */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        <AnimatePresence>
          {filteredFiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
                {getMediaIcon('image')}
              </div>
              <p className="text-sm text-dark-400 mb-1">No media files</p>
              <p className="text-xs text-dark-500">Upload some files to get started</p>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="bg-dark-700 rounded-lg overflow-hidden group cursor-pointer"
                  draggable
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'media',
                      data: file
                    }));
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-dark-600">
                    {file.type === 'image' && file.thumbnail && (
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // サムネイル読み込み失敗時はアイコンに切り替え
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
                            <Video className="w-8 h-8 text-dark-400" />
                          </div>
                        )}
                      </div>
                    )}
                    {file.type === 'audio' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-dark-400" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex space-x-2">
                        <button className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                          <Play className="w-3 h-3" />
                        </button>
                        <button className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                          <Eye className="w-3 h-3" />
                        </button>
                        {file.type === 'audio' && onAudioAnalyze && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onAudioAnalyze(file);
                            }}
                            className="p-1.5 bg-purple-500/80 rounded-full hover:bg-purple-600/80 transition-colors"
                            title="音声解析・MVプロンプト生成"
                          >
                            <Brain className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Type Icon */}
                    <div className="absolute top-2 left-2 p-1 bg-black/50 rounded">
                      {getMediaIcon(file.type)}
                    </div>
                    
                    {/* Resolution indicator */}
                    {(file.width && file.height) && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs">
                        {formatResolution(file.width, file.height)}
                      </div>
                    )}

                    {/* Duration (for video/audio) */}
                    {file.duration && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs">
                        {formatDuration(file.duration)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <span className="text-xs text-dark-400">
                          {formatFileSize(file.size)}
                        </span>
                        {(file.width && file.height) && (
                          <span className="text-xs text-dark-500">
                            {formatResolution(file.width, file.height)}
                          </span>
                        )}
                      </div>
                      <button className="p-1 hover:bg-dark-600 rounded opacity-0 group-hover:opacity-100 transition-all">
                        <MoreVertical className="w-3 h-3 text-dark-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors group cursor-pointer"
                  draggable
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'media',
                      data: file
                    }));
                  }}
                >
                  <div className="w-10 h-10 bg-dark-600 rounded flex items-center justify-center mr-3">
                    {getMediaIcon(file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-dark-400">
                      <span>{formatFileSize(file.size)}</span>
                      {file.duration && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(file.duration)}</span>
                        </>
                      )}
                      {(file.width && file.height) && (
                        <>
                          <span>•</span>
                          <span>{formatResolution(file.width, file.height)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-dark-500 rounded">
                      <Play className="w-3 h-3" />
                    </button>
                    {file.type === 'audio' && onAudioAnalyze && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAudioAnalyze(file);
                        }}
                        className="p-1.5 hover:bg-purple-500 rounded text-purple-400"
                        title="音声解析・MVプロンプト生成"
                      >
                        <Brain className="w-3 h-3" />
                      </button>
                    )}
                    <button className="p-1.5 hover:bg-dark-500 rounded">
                      <Download className="w-3 h-3" />
                    </button>
                    <button className="p-1.5 hover:bg-red-500 rounded text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { MediaLibrary };
export default MediaLibrary;
