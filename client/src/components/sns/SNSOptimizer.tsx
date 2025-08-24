import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Smartphone,
  Monitor,
  Square,
  Settings,
  Crop,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  Zap
} from 'lucide-react';
import { SNSOptimizerProps, SNSPreset } from '../../types';

const SNS_PRESETS: Record<string, SNSPreset> = {
  instagram_reel: {
    id: 'instagram_reel',
    platform: 'instagram',
    name: 'Instagram リール',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 90,
    maxFileSize: 100,
    recommendedBitrate: 5000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30],
    safeArea: { top: 15, bottom: 20, left: 5, right: 5 },
    requirements: { maxDuration: 90, audioRequired: true, captionsRecommended: true },
    optimization: { cropStrategy: 'smart', scaleStrategy: 'fill', compressionLevel: 'medium', motionBlur: true, deinterlace: true }
  },
  instagram_story: {
    id: 'instagram_story',
    platform: 'instagram',
    name: 'Instagram ストーリー',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 15,
    maxFileSize: 50,
    recommendedBitrate: 4000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30],
    safeArea: { top: 20, bottom: 25, left: 8, right: 8 },
    requirements: { maxDuration: 15, audioRequired: false },
    optimization: { cropStrategy: 'center', scaleStrategy: 'fill', compressionLevel: 'medium', motionBlur: false, deinterlace: true }
  },
  tiktok: {
    id: 'tiktok',
    platform: 'tiktok',
    name: 'TikTok',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 180,
    maxFileSize: 150,
    recommendedBitrate: 6000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30, 60],
    safeArea: { top: 12, bottom: 18, left: 3, right: 3 },
    requirements: { minDuration: 3, maxDuration: 180, audioRequired: true, captionsRecommended: true },
    optimization: { cropStrategy: 'smart', scaleStrategy: 'fill', compressionLevel: 'low', motionBlur: true, deinterlace: true }
  },
  youtube_shorts: {
    id: 'youtube_shorts',
    platform: 'youtube_shorts',
    name: 'YouTube Shorts',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 60,
    maxFileSize: 200,
    recommendedBitrate: 8000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30, 60],
    safeArea: { top: 10, bottom: 15, left: 5, right: 5 },
    requirements: { maxDuration: 60, audioRequired: false },
    optimization: { cropStrategy: 'smart', scaleStrategy: 'fill', compressionLevel: 'low', motionBlur: false, deinterlace: true }
  },
  twitter: {
    id: 'twitter',
    platform: 'twitter',
    name: 'Twitter (X)',
    aspectRatio: '16:9',
    resolution: { width: 1280, height: 720 },
    maxDuration: 140,
    maxFileSize: 512,
    recommendedBitrate: 5000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30],
    safeArea: { top: 5, bottom: 5, left: 5, right: 5 },
    requirements: { maxDuration: 140 },
    optimization: { cropStrategy: 'center', scaleStrategy: 'fit', compressionLevel: 'high', motionBlur: false, deinterlace: false }
  }
};

const getPlatformIcon = (id: string) => {
  switch (id) {
    case 'instagram_reel':
    case 'instagram_story':
      return Share2;
    case 'tiktok':
      return Smartphone;
    case 'youtube_shorts':
      return Monitor;
    case 'twitter':
      return Share2;
    default:
      return Square;
  }
};

const SNSOptimizer: React.FC<SNSOptimizerProps> = ({
  project,
  targetPlatforms,
  onOptimizationApply,
  onPreviewGenerate
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram_reel');
  const [customSettings, setCustomSettings] = useState<Partial<SNSPreset>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentPreset = SNS_PRESETS[selectedPlatform];
  const currentDuration = project.timeline.duration;

  const compatibility = useMemo(() => {
    if (!currentPreset) return null;
    const issues: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (currentPreset.requirements.maxDuration && currentDuration > currentPreset.requirements.maxDuration) {
      issues.push(`動画が長すぎます (${currentDuration}秒 > ${currentPreset.requirements.maxDuration}秒)`);
    }
    if ((currentPreset as any).requirements.minDuration && currentDuration < (currentPreset as any).requirements.minDuration) {
      issues.push(`動画が短すぎます (${currentDuration}秒 < ${(currentPreset as any).requirements.minDuration}秒)`);
    }

    const currentAspect = project.settings.resolution;
    if (currentAspect !== currentPreset.aspectRatio) {
      warnings.push(`アスペクト比が異なります (${currentAspect} → ${currentPreset.aspectRatio})`);
      suggestions.push('自動クロップまたはスケーリングを適用します');
    }

    const hasAudio = project.timeline.audioTracks.length > 0;
    if (currentPreset.requirements.audioRequired && !hasAudio) {
      issues.push('音声トラックが必要です');
    }
    if (currentPreset.requirements.captionsRecommended) {
      suggestions.push('字幕の追加を検討してください');
    }

    const score = issues.length === 0 ? (warnings.length === 0 ? 100 : 80) : 40;
    return { score, issues, warnings, suggestions };
  }, [currentPreset, currentDuration, project]);

  const handleOptimize = async () => {
    const optimized: SNSPreset = {
      ...currentPreset,
      ...(customSettings as SNSPreset)
    };
    onOptimizationApply(optimized);
  };

  const handlePreview = () => {
    onPreviewGenerate(selectedPlatform);
  };

  return (
    <div className="h-full bg-dark-900 overflow-y-auto">
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">SNS最適化</h2>
            <p className="text-sm text-gray-400">プラットフォーム向けに自動最適化</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.values(SNS_PRESETS).map((preset) => {
            const Icon = getPlatformIcon(preset.id);
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPlatform(preset.id)}
                className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                  selectedPlatform === preset.id
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-dark-800 border-dark-600 text-gray-400 hover:text-white hover:border-dark-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">{preset.name}</div>
                  <div className="text-xs opacity-70">{preset.aspectRatio}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {currentPreset && (
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">{currentPreset.name}</h3>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="p-2 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white rounded-lg transition-all flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>詳細設定</span>
              <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <Crop className="w-3 h-3" />
              </motion.div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">最大時間:</span>
                <span className="text-white">{currentPreset.maxDuration}秒</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">最大ファイルサイズ:</span>
                <span className="text-white">{currentPreset.maxFileSize}MB</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">推奨ビットレート:</span>
                <span className="text-white">{currentPreset.recommendedBitrate}kbps</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">フレームレート:</span>
                <span className="text-white">{currentPreset.frameRate.join(', ')}fps</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">音声コーデック:</span>
                <span className="text-white">{currentPreset.audioCodec.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">動画コーデック:</span>
                <span className="text-white">{currentPreset.videoCodec.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">クロップ方法</label>
                  <select
                    value={customSettings.optimization?.cropStrategy || currentPreset.optimization.cropStrategy}
                    onChange={(e) =>
                      setCustomSettings((prev) => ({
                        ...prev,
                        optimization: { ...prev.optimization, cropStrategy: e.target.value as any }
                      }))
                    }
                    className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="center">中央</option>
                    <option value="smart">スマート</option>
                    <option value="manual">手動</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">圧縮レベル</label>
                  <select
                    value={customSettings.optimization?.compressionLevel || currentPreset.optimization.compressionLevel}
                    onChange={(e) =>
                      setCustomSettings((prev) => ({
                        ...prev,
                        optimization: { ...prev.optimization, compressionLevel: e.target.value as any }
                      }))
                    }
                    className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="low">低（高品質）</option>
                    <option value="medium">中</option>
                    <option value="high">高（小サイズ）</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {compatibility && (
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle
              className={`w-4 h-4 ${
                compatibility.score >= 80 ? 'text-green-400' : compatibility.score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}
            />
            <h4 className="text-sm font-medium text-white">適合性チェック</h4>
            <span
              className={`text-sm font-medium ${
                compatibility.score >= 80 ? 'text-green-400' : compatibility.score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}
            >
              {compatibility.score}%
            </span>
          </div>

          {compatibility.issues.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">解決が必要</span>
              </div>
              <div className="space-y-1">
                {compatibility.issues.map((issue, i) => (
                  <div key={i} className="text-xs text-gray-300 pl-4">• {issue}</div>
                ))}
              </div>
            </div>
          )}

          {compatibility.warnings.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400">注意</span>
              </div>
              <div className="space-y-1">
                {compatibility.warnings.map((w, i) => (
                  <div key={i} className="text-xs text-gray-300 pl-4">• {w}</div>
                ))}
              </div>
            </div>
          )}

          {compatibility.suggestions.length > 0 && (
            <div>
              <div className="flex items-center space-x-1 mb-2">
                <Info className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">提案</span>
              </div>
              <div className="space-y-1">
                {compatibility.suggestions.map((s, i) => (
                  <div key={i} className="text-xs text-gray-300 pl-4">• {s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="space-y-3">
          <button
            onClick={handlePreview}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>プレビュー生成</span>
          </button>

          <button
            onClick={handleOptimize}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>最適化実行</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SNSOptimizer;
