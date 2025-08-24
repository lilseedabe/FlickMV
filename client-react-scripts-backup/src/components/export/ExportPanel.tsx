import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Settings, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  X,
  Loader2,
  FileVideo,
  Upload,
  Monitor,
  Smartphone,
  Square,
  Film,
  Zap
} from 'lucide-react';
import type { Project, ExportJob, Timeline, ProjectSettings, Resolution } from '@/types';

interface ExportPanelProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onExportStart?: (job: ExportJob) => void;
}

interface ExportSettings {
  resolution: Resolution;
  frameRate: 24 | 30 | 60;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'mp4' | 'webm';
  includeAudio: boolean;
  name?: string;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  project,
  isOpen,
  onClose,
  onExportStart
}) => {
  const initialAspect: Resolution =
    (project.settings?.resolution === '9:16' ||
     project.settings?.resolution === '1:1' ||
     project.settings?.resolution === '16:9')
      ? project.settings.resolution
      : '9:16';

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: initialAspect,
    frameRate: project.settings?.frameRate || 30,
    quality: 'high',
    format: 'mp4',
    includeAudio: true,
    name: `${project.name} Export`
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  // プリセット設定
  const presets = {
    instagram_story: {
      label: 'Instagram Story',
      icon: <Smartphone className="w-4 h-4" />,
      settings: { resolution: '9:16' as const, frameRate: 30 as const, quality: 'high' as const }
    },
    instagram_post: {
      label: 'Instagram Post',
      icon: <Square className="w-4 h-4" />,
      settings: { resolution: '1:1' as const, frameRate: 30 as const, quality: 'high' as const }
    },
    youtube: {
      label: 'YouTube',
      icon: <Monitor className="w-4 h-4" />,
      settings: { resolution: '16:9' as const, frameRate: 30 as const, quality: 'ultra' as const }
    },
    tiktok: {
      label: 'TikTok',
      icon: <Smartphone className="w-4 h-4" />,
      settings: { resolution: '9:16' as const, frameRate: 30 as const, quality: 'high' as const }
    }
  };

  // エクスポート時間を計算
  useEffect(() => {
    const duration = project.timeline?.duration || 0;
    const multiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4
    }[exportSettings.quality];

    const estimatedSeconds = duration * multiplier;
    
    if (estimatedSeconds < 60) {
      setEstimatedTime(`~${Math.round(estimatedSeconds)}s`);
    } else {
      setEstimatedTime(`~${Math.round(estimatedSeconds / 60)}min`);
    }
  }, [exportSettings.quality, project.timeline?.duration]);

  // エクスポートジョブ一覧を取得
  const fetchExportJobs = async () => {
    try {
      const response = await fetch('/api/export/jobs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setExportJobs(data.data.exportJobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch export jobs:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExportJobs();
      // 5秒ごとに更新
      const interval = setInterval(fetchExportJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // プリセット適用
  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presets[presetKey]) {
      setExportSettings(prev => ({
        ...prev,
        ...presets[presetKey].settings
      }));
    }
  };

  // エクスポート開始
  const handleExport = async () => {
    if (!project.timeline?.clips?.length) {
      alert('プロジェクトにクリップがありません');
      return;
    }

    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/export/${project.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: exportSettings.name,
          settings: exportSettings
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const newJob = data.data.exportJob;
        setExportJobs(prev => [newJob, ...prev]);
        onExportStart?.(newJob);
        
        // リアルタイム更新開始
        const interval = setInterval(async () => {
          try {
            const jobResponse = await fetch(`/api/export/jobs/${newJob.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const jobData = await jobResponse.json();
            
            if (jobData.success) {
              const updatedJob = jobData.data.exportJob;
              setExportJobs(prev => 
                prev.map(job => job.id === updatedJob.id ? updatedJob : job)
              );
              
              // 完了または失敗したら更新を停止
              if (['completed', 'failed', 'cancelled'].includes(updatedJob.status)) {
                clearInterval(interval);
              }
            }
          } catch (error) {
            console.error('Failed to update job status:', error);
            clearInterval(interval);
          }
        }, 2000);
        
        // 10分後にタイムアウト
        setTimeout(() => clearInterval(interval), 600000);
        
      } else {
        alert(data.message || 'エクスポートに失敗しました');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  // ジョブキャンセル
  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/export/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchExportJobs();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  // ジョブダウンロード
  const downloadJob = async (jobId: string) => {
    try {
      window.open(`/api/export/jobs/${jobId}/download`, '_blank');
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResolutionLabel = (resolution: string) => {
    const labels = {
      '9:16': 'Vertical (1080×1920)',
      '1:1': 'Square (1080×1080)',
      '16:9': 'Horizontal (1920×1080)'
    };
    return labels[resolution] || resolution;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-dark-800 rounded-lg border border-dark-600 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-dark-700">
            <div className="flex items-center space-x-3">
              <FileVideo className="w-6 h-6 text-primary-400" />
              <h2 className="text-xl font-semibold text-white">Export Video</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* 設定パネル */}
            <div className="w-1/2 p-6 border-r border-dark-700 overflow-y-auto">
              <h3 className="text-lg font-medium text-white mb-4">Export Settings</h3>
              
              {/* プリセット */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-3">
                  Platform Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(presets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                        selectedPreset === key
                          ? 'border-primary-400 bg-primary-500/20 text-primary-400'
                          : 'border-dark-600 hover:border-dark-500 text-dark-300'
                      }`}
                    >
                      {preset.icon}
                      <span className="text-sm font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 解像度 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Resolution
                </label>
                <select
                  value={exportSettings.resolution}
                  onChange={(e) => {
                    setExportSettings(prev => ({ ...prev, resolution: e.target.value as Resolution }));
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="9:16">9:16 - Vertical (1080×1920)</option>
                  <option value="1:1">1:1 - Square (1080×1080)</option>
                  <option value="16:9">16:9 - Horizontal (1920×1080)</option>
                </select>
              </div>

              {/* フレームレート */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Frame Rate
                </label>
                <select
                  value={exportSettings.frameRate}
                  onChange={(e) => {
                    setExportSettings(prev => ({ ...prev, frameRate: parseInt(e.target.value) as any }));
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value={24}>24 FPS - Cinematic</option>
                  <option value={30}>30 FPS - Standard</option>
                  <option value={60}>60 FPS - Smooth</option>
                </select>
              </div>

              {/* 品質 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Quality
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'low', label: 'Low', desc: 'Fast' },
                    { value: 'medium', label: 'Medium', desc: 'Balanced' },
                    { value: 'high', label: 'High', desc: 'Quality' },
                    { value: 'ultra', label: 'Ultra', desc: 'Slow' }
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setExportSettings(prev => ({ ...prev, quality: value as any }));
                        setSelectedPreset('custom');
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        exportSettings.quality === value
                          ? 'border-primary-400 bg-primary-500/20'
                          : 'border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-dark-400">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ファイル名 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Export Name
                </label>
                <input
                  type="text"
                  value={exportSettings.name}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter export name..."
                />
              </div>

              {/* エクスポートボタン */}
              <button
                onClick={handleExport}
                disabled={isExporting || !project.timeline?.clips?.length}
                className="w-full flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Start Export</span>
                    <span className="text-sm opacity-70">({estimatedTime})</span>
                  </>
                )}
              </button>
            </div>

            {/* ジョブリスト */}
            <div className="w-1/2 p-6 overflow-y-auto">
              <h3 className="text-lg font-medium text-white mb-4">Export History</h3>
              
              <div className="space-y-3">
                {exportJobs.length === 0 ? (
                  <div className="text-center py-8 text-dark-400">
                    <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No exports yet</p>
                    <p className="text-sm">Start your first export to see it here</p>
                  </div>
                ) : (
                  exportJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-dark-700 rounded-lg p-4 border border-dark-600"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.status)}
                          <h4 className="font-medium text-white truncate">{job.name}</h4>
                        </div>
                        <div className="flex items-center space-x-1">
                          {job.status === 'completed' && (
                            <button
                              onClick={() => downloadJob(job.id)}
                              className="p-1 hover:bg-dark-600 rounded text-green-400"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {['queued', 'processing'].includes(job.status) && (
                            <button
                              onClick={() => cancelJob(job.id)}
                              className="p-1 hover:bg-dark-600 rounded text-red-400"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-dark-400 mb-2">
                        {getResolutionLabel(job.settings?.resolution)} • {job.settings?.quality} quality
                      </div>
                      
                      {job.status === 'processing' && (
                        <div className="w-full bg-dark-600 rounded-full h-2 mb-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-dark-400">
                        <span>{new Date(job.createdAt).toLocaleString()}</span>
                        {job.status === 'processing' && (
                          <span>{job.progress || 0}%</span>
                        )}
                        {job.output?.size && (
                          <span>{(job.output.size / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExportPanel;