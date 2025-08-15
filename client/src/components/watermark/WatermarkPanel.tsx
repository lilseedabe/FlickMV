import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown,
  Lock,
  Unlock,
  Star,
  Zap,
  Eye,
  EyeOff,
  Settings,
  Info,
  AlertCircle,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Shield,
  Award,
  ChevronDown,
  ChevronUp,
  Play,
  Download
} from 'lucide-react';

interface User {
  plan: 'free' | 'basic' | 'pro' | 'premium';
  canRemoveWatermark: boolean;
}

interface WatermarkPreset {
  id: string;
  name: string;
  position: { x: number; y: number };
  size: number;
  opacity: number;
  style: 'minimal' | 'branded' | 'corner' | 'center';
}

interface WatermarkPanelProps {
  user: User;
  onUpgrade: (plan: string) => void;
  onWatermarkChange: (enabled: boolean, preset: WatermarkPreset) => void;
}

const WatermarkPanel: React.FC<WatermarkPanelProps> = ({
  user,
  onUpgrade,
  onWatermarkChange
}) => {
  const [watermarkEnabled, setWatermarkEnabled] = useState(!user.canRemoveWatermark);
  const [selectedPreset, setSelectedPreset] = useState<string>('minimal');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // FlickMV watermark presets
  const watermarkPresets: WatermarkPreset[] = [
    {
      id: 'minimal',
      name: 'ミニマル',
      position: { x: 85, y: 10 },
      size: 12,
      opacity: 60,
      style: 'minimal'
    },
    {
      id: 'branded',
      name: 'ブランド強調',
      position: { x: 50, y: 50 },
      size: 25,
      opacity: 30,
      style: 'branded'
    },
    {
      id: 'corner',
      name: '右下コーナー',
      position: { x: 90, y: 90 },
      size: 15,
      opacity: 70,
      style: 'corner'
    },
    {
      id: 'center',
      name: '中央配置',
      position: { x: 50, y: 85 },
      size: 18,
      opacity: 50,
      style: 'center'
    }
  ];

  const planFeatures = {
    free: {
      name: 'フリープラン',
      price: '¥0',
      watermark: '必須',
      features: ['基本編集機能', 'FlickMV透かし付き', '720p出力'],
      color: 'gray'
    },
    basic: {
      name: 'ベーシック',
      price: '¥980/月',
      watermark: '必須',
      features: ['高度編集機能', 'FlickMV透かし付き', '1080p出力', '優先サポート'],
      color: 'blue'
    },
    pro: {
      name: 'プロ',
      price: '¥1,980/月',
      watermark: '削除可能',
      features: ['全機能利用可能', '透かし削除可能', '4K出力', 'プレミアムテンプレート'],
      color: 'purple'
    },
    premium: {
      name: 'プレミアム',
      price: '¥2,980/月',
      watermark: '削除可能',
      features: ['全機能 + AI機能', '透かし削除可能', '無制限出力', '専用サポート'],
      color: 'gold'
    }
  };

  const currentPreset = watermarkPresets.find(p => p.id === selectedPreset) || watermarkPresets[0];

  const handleWatermarkToggle = () => {
    if (user.canRemoveWatermark) {
      const newEnabled = !watermarkEnabled;
      setWatermarkEnabled(newEnabled);
      onWatermarkChange(newEnabled, currentPreset);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = watermarkPresets.find(p => p.id === presetId) || watermarkPresets[0];
    onWatermarkChange(watermarkEnabled, preset);
  };

  const handleUpgrade = (plan: string) => {
    onUpgrade(plan);
    setShowUpgradeModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-purple-500/30"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">プランをアップグレード</h2>
                      <p className="text-gray-400">透かしを削除してプロレベルの動画を作成</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="p-2 hover:bg-dark-700 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {Object.entries(planFeatures).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        user.plan === key
                          ? 'border-purple-500 bg-purple-500/10'
                          : key === 'pro' || key === 'premium'
                          ? 'border-purple-400/50 hover:border-purple-400 bg-dark-750'
                          : 'border-dark-600 bg-dark-750'
                      }`}
                    >
                      <div className="text-center">
                        <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                        <div className="text-2xl font-bold mb-1">{plan.price}</div>
                        <div className={`text-sm mb-4 px-2 py-1 rounded-full ${
                          plan.watermark === '削除可能' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          透かし: {plan.watermark}
                        </div>
                        
                        <ul className="space-y-2 text-sm text-gray-300 mb-4">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                              <Check className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {user.plan === key ? (
                          <div className="bg-purple-500/20 text-purple-400 py-2 px-4 rounded-lg text-sm font-medium">
                            現在のプラン
                          </div>
                        ) : (key === 'pro' || key === 'premium') ? (
                          <button
                            onClick={() => handleUpgrade(key)}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
                          >
                            アップグレード
                          </button>
                        ) : (
                          <div className="text-gray-500 text-sm">現在より下位プラン</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-400 mb-1">透かしについて</h4>
                      <p className="text-sm text-gray-300">
                        FlickMVの透かしは、フリープランとベーシックプランで動画に自動追加されます。
                        プロプラン以上では透かしを完全に削除して、完全にブランドフリーな動画を作成できます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark Toggle */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              watermarkEnabled ? 'bg-purple-500/20' : 'bg-gray-600/20'
            }`}>
              {watermarkEnabled ? <Eye className="w-5 h-5 text-purple-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
            </div>
            <div>
              <h3 className="font-semibold">FlickMV透かし</h3>
              <p className="text-sm text-gray-400">
                {user.canRemoveWatermark ? '透かしのオン/オフを切り替えできます' : 'プロプラン以上で削除可能'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!user.canRemoveWatermark && (
              <Lock className="w-4 h-4 text-yellow-400" />
            )}
            <button
              onClick={handleWatermarkToggle}
              disabled={!user.canRemoveWatermark}
              className={`relative w-12 h-6 rounded-full transition-all ${
                watermarkEnabled 
                  ? 'bg-purple-500' 
                  : user.canRemoveWatermark 
                  ? 'bg-gray-600' 
                  : 'bg-gray-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full transition-all top-0.5 ${
                watermarkEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {!user.canRemoveWatermark && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-400 font-medium">プロプラン以上が必要</p>
                <p className="text-gray-300">透かしを削除するにはプランのアップグレードが必要です</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Selection */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <h3 className="font-semibold mb-4">透かしスタイル</h3>
        <p className="text-sm text-gray-400 mb-4">
          透かしの表示スタイルを選択してください
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {watermarkPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedPreset === preset.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-dark-600 hover:border-dark-500 bg-dark-750'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{preset.name}</h4>
                  <p className="text-sm text-gray-400">
                    位置: {preset.position.x}%, {preset.position.y}% | 
                    サイズ: {preset.size}px | 
                    透明度: {preset.opacity}%
                  </p>
                </div>
                {selectedPreset === preset.id && (
                  <Check className="w-5 h-5 text-purple-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Settings Display */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <h3 className="font-semibold mb-4">現在の設定</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">状態:</span>
            <span className={watermarkEnabled ? 'text-green-400' : 'text-red-400'}>
              {watermarkEnabled ? '表示中' : '非表示'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">スタイル:</span>
            <span className="text-white">{currentPreset.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">位置:</span>
            <span className="text-white">X: {currentPreset.position.x}%, Y: {currentPreset.position.y}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">サイズ:</span>
            <span className="text-white">{currentPreset.size}px</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">透明度:</span>
            <span className="text-white">{currentPreset.opacity}%</span>
          </div>
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <div className="flex items-start space-x-4">
          <Info className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-400 mb-2">FlickMV透かしについて</h3>
            <div className="text-gray-300 space-y-2 text-sm">
              <p>
                • FlickMVの透かしは、フリープランとベーシックプランのユーザーに自動的に追加されます
              </p>
              <p>
                • 透かしは動画の品質に影響を与えず、エクスポート時に適用されます
              </p>
              <p>
                • プロプラン以上では透かしを完全に削除して、ブランドフリーな動画を作成できます
              </p>
              <p>
                • 透かしのスタイルは変更可能ですが、「FlickMV」の表記は変更できません
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatermarkPanel;