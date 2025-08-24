import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2,
  Download,
  X,
  Play,
  Pause,
  Film
} from 'lucide-react';

interface ExportProgressProps {
  jobId: string;
  isVisible: boolean;
  onClose: () => void;
  onComplete?: (job: any) => void;
}

const ExportProgress: React.FC<ExportProgressProps> = ({
  jobId,
  isVisible,
  onClose,
  onComplete
}) => {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ジョブ状態を取得
  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/export/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJob(data.data.exportJob);
        setError(null);
        
        // 完了時にコールバック実行
        if (data.data.exportJob.status === 'completed' && onComplete) {
          onComplete(data.data.exportJob);
        }
      } else {
        setError(data.message || 'Failed to fetch job status');
      }
    } catch (err) {
      setError('Network error');
      console.error('Failed to fetch job status:', err);
    } finally {
      setLoading(false);
    }
  };

  // 定期的に状態を更新
  useEffect(() => {
    if (!jobId || !isVisible) return;

    fetchJobStatus();
    
    // 完了していない場合は2秒ごとに更新
    const interval = setInterval(() => {
      if (!job || ['queued', 'processing'].includes(job.status)) {
        fetchJobStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, isVisible]);

  // ジョブキャンセル
  const cancelJob = async () => {
    try {
      const response = await fetch(`/api/export/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await fetchJobStatus();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  // ダウンロード
  const downloadResult = () => {
    if (job?.status === 'completed') {
      window.open(`/api/export/jobs/${jobId}/download`, '_blank');
    }
  };

  const getStatusInfo = () => {
    if (!job) return { icon: <Loader2 className="w-6 h-6 animate-spin" />, text: 'Loading...', color: 'text-blue-500' };
    
    switch (job.status) {
      case 'queued':
        return { 
          icon: <Clock className="w-6 h-6" />, 
          text: 'Queued for processing...', 
          color: 'text-yellow-500' 
        };
      case 'processing':
        return { 
          icon: <Loader2 className="w-6 h-6 animate-spin" />, 
          text: 'Processing video...', 
          color: 'text-blue-500' 
        };
      case 'completed':
        return { 
          icon: <CheckCircle className="w-6 h-6" />, 
          text: 'Export completed!', 
          color: 'text-green-500' 
        };
      case 'failed':
        return { 
          icon: <AlertCircle className="w-6 h-6" />, 
          text: 'Export failed', 
          color: 'text-red-500' 
        };
      case 'cancelled':
        return { 
          icon: <X className="w-6 h-6" />, 
          text: 'Export cancelled', 
          color: 'text-gray-500' 
        };
      default:
        return { 
          icon: <Clock className="w-6 h-6" />, 
          text: 'Unknown status', 
          color: 'text-gray-500' 
        };
    }
  };

  const getProgressPhase = (progress: number) => {
    if (progress < 25) return 'Initializing...';
    if (progress < 50) return 'Processing clips...';
    if (progress < 75) return 'Applying effects...';
    if (progress < 90) return 'Rendering video...';
    if (progress < 100) return 'Finalizing...';
    return 'Complete!';
  };

  if (!isVisible) return null;

  const statusInfo = getStatusInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 right-6 bg-dark-800 border border-dark-600 rounded-lg shadow-xl w-96 z-50"
    >
      <div className="p-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Film className="w-5 h-5 text-primary-400" />
            <h3 className="font-medium text-white">Export Progress</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-600 rounded"
          >
            <X className="w-4 h-4 text-dark-400" />
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ジョブ情報 */}
        {job && (
          <div className="space-y-4">
            {/* ジョブ名 */}
            <div>
              <h4 className="text-white font-medium truncate">{job.name}</h4>
              <p className="text-sm text-dark-400">
                {job.settings?.resolution} • {job.settings?.quality} quality
              </p>
            </div>

            {/* 状態表示 */}
            <div className="flex items-center space-x-3">
              <div className={statusInfo.color}>
                {statusInfo.icon}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{statusInfo.text}</p>
                {job.status === 'processing' && (
                  <p className="text-xs text-dark-400">
                    {getProgressPhase(job.progress || 0)}
                  </p>
                )}
              </div>
            </div>

            {/* プログレスバー */}
            {job.status === 'processing' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-dark-400">
                  <span>Progress</span>
                  <span>{job.progress || 0}%</span>
                </div>
                <div className="w-full bg-dark-600 rounded-full h-2">
                  <motion.div 
                    className="bg-primary-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${job.progress || 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* 詳細情報 */}
            <div className="text-xs text-dark-400 space-y-1">
              <div className="flex justify-between">
                <span>Started:</span>
                <span>{new Date(job.createdAt).toLocaleString()}</span>
              </div>
              {job.completedAt && (
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span>{new Date(job.completedAt).toLocaleString()}</span>
                </div>
              )}
              {job.output?.size && (
                <div className="flex justify-between">
                  <span>File size:</span>
                  <span>{(job.output.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              )}
            </div>

            {/* エラー詳細 */}
            {job.status === 'failed' && job.processing?.error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  {job.processing.error.message || 'Unknown error occurred'}
                </p>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex items-center space-x-2">
              {job.status === 'completed' && (
                <button
                  onClick={downloadResult}
                  className="flex-1 flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )}
              
              {['queued', 'processing'].includes(job.status) && (
                <button
                  onClick={cancelJob}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              )}
              
              {job.status === 'failed' && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* ローディング状態 */}
        {loading && !job && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ExportProgress;
