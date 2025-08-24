import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Crown,
  Star,
  Check,
  X,
  Zap,
  Shield,
  Award,
  TrendingUp,
  Users,
  Heart,
  Video,
  Download,
  Sparkles,
  ArrowRight,
  CreditCard,
  AlertCircle,
  Info,
  Gift,
  Calendar,
  BarChart3,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';

// Mock user data
const mockUser = {
  id: 'user1',
  name: 'ユーザー太郎',
  email: 'user@example.com',
  plan: 'free', // free, light, standard, pro
  subscription: {
    status: 'active',
    currentPeriodEnd: new Date('2024-03-15'),
    cancelAtPeriodEnd: false
  },
  usage: {
    exportsThisMonth: 2,
    totalExports: 15,
    lastExportDate: new Date('2024-01-20')
  }
};

const planFeatures = {
  free: {
    name: 'フリー',
    price: '¥0',
    period: '永続無料',
    description: '個人利用や学習目的に最適',
    watermark: '必須',
    processingMethod: 'VPS専用',
    profitRate: -126,
    features: [
      '基本編集機能',
      'VPS専用処理',
      '720p出力',
      '月3本まで出力',
      '音声解析無制限',
      'コミュニティサポート'
    ],
    limits: {
      exportsPerMonth: 3,
      maxResolution: '720p',
      audioAnalysis: 'unlimited',
      watermarkRemoval: false
    },
    color: 'gray',
    popular: false
  },
  light: {
    name: 'ライト',
    price: '¥1,480',
    period: '月額',
    description: '個人クリエイター向けの充実機能',
    watermark: '必須',
    processingMethod: 'GCP専用',
    profitRate: 36,
    features: [
      '高度編集機能',
      'GCP専用処理',
      '1080p出力',
      '月10本まで出力',
      '音声解析無制限',
      '優先サポート'
    ],
    limits: {
      exportsPerMonth: 10,
      maxResolution: '1080p',
      audioAnalysis: 'unlimited',
      watermarkRemoval: false
    },
    color: 'blue',
    popular: false
  },
  standard: {
    name: 'スタンダード',
    price: '¥2,980',
    period: '月額',
    description: 'プロフェッショナル向けの完全版',
    watermark: '削除可能',
    processingMethod: 'GCP専用',
    profitRate: 50,
    features: [
      '全機能利用可能',
      'GCP専用処理',
      '1080p-4K出力対応',
      '月25本まで出力',
      '音声解析無制限',
      '優先レンダリング'
    ],
    limits: {
      exportsPerMonth: 25,
      maxResolution: '1080p-4K',
      audioAnalysis: 'unlimited',
      watermarkRemoval: true
    },
    color: 'purple',
    popular: true
  },
  pro: {
    name: 'プロ',
    price: '¥5,480',
    period: '月額',
    description: 'エンタープライズ向け最上位プラン',
    watermark: '削除可能',
    processingMethod: 'GCP専用',
    profitRate: 55,
    features: [
      '全機能 + AI機能',
      'GCP専用処理',
      '4K出力対応',
      '月40本まで出力',
      '音声解析無制限',
      '専用サポート',
      'API連携'
    ],
    limits: {
      exportsPerMonth: 40,
      maxResolution: '4K',
      audioAnalysis: 'unlimited',
      watermarkRemoval: true
    },
    color: 'gold',
    popular: false
  }
};

const Pricing: React.FC = () => {
  const [user] = useState(mockUser);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPlan = planFeatures[user.plan as keyof typeof planFeatures];
  const remainingExports = currentPlan.limits.exportsPerMonth === -1 
    ? -1 
    : Math.max(0, currentPlan.limits.exportsPerMonth - user.usage.exportsThisMonth);

  const handlePlanSelect = (planKey: string) => {
    if (planKey === user.plan) return;
    setSelectedPlan(planKey);
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setShowUpgradeModal(false);
    
    // In real app, redirect to payment processor
    console.log(`Upgrading to ${selectedPlan}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'free': return Star;
      case 'light': return Zap;
      case 'standard': return Crown;
      case 'pro': return Award;
      default: return Star;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-900 to-purple-900/20">
      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && selectedPlan && (
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
              className="bg-dark-800 rounded-2xl max-w-md w-full border border-purple-500/30"
            >
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">プランをアップグレード</h2>
                  <p className="text-gray-400">
                    {planFeatures[selectedPlan as keyof typeof planFeatures].name}プランに変更しますか？
                  </p>
                </div>

                <div className="bg-dark-750 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400">現在のプラン</span>
                    <span className="font-medium">{currentPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">新しいプラン</span>
                    <span className="text-purple-400 font-medium">
                      {planFeatures[selectedPlan as keyof typeof planFeatures].name}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-green-400">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">透かし削除可能</span>
                  </div>
                  <div className="flex items-center text-green-400">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">高解像度出力</span>
                  </div>
                  <div className="flex items-center text-green-400">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">出力回数増加</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    disabled={loading}
                    className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>アップグレード</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items<center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                プラン・課金
              </h1>
              <p className="text-dark-400 text-lg">
                あなたに最適なプランをお選びください
              </p>
            </div>
            <Link 
              to="/dashboard"
              className="flex items-center space-x-2 bg-dark-800 hover:bg-dark-700 text-gray-300 px-4 py-2 rounded-lg transition-all"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>ダッシュボードに戻る</span>
            </Link>
          </div>
        </motion.div>

        {/* Current Plan Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-6 border border-dark-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-lg bg-${currentPlan.color}-500/20 flex items-center justify-center`}>
                  {React.createElement(getPlanIcon(user.plan), { 
                    className: `w-6 h-6 text-${currentPlan.color}-400` 
                  })}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{currentPlan.name}</h2>
                  <p className="text-gray-400">{currentPlan.description}</p>
                </div>
              </div>
              {user.plan !== 'pro' && (
                <button
                  onClick={() => setSelectedPlan('pro')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>アップグレード</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-dark-750 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">今月の出力</span>
                </div>
                <div className="text-2xl font-bold">
                  {user.usage.exportsThisMonth}
                  <span className="text-sm text-gray-400 font-normal">
                    / {currentPlan.limits.exportsPerMonth}本
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  残り {currentPlan.limits.exportsPerMonth - user.usage.exportsThisMonth} 本
                </p>
              </div>

              <div className="bg-dark-750 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Settings className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">処理方式</span>
                </div>
                <div className="text-2xl font-bold">{currentPlan.processingMethod}</div>
              </div>

              <div className="bg-dark-750 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Video className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">最大解像度</span>
                </div>
                <div className="text-2xl font-bold">{currentPlan.limits.maxResolution}</div>
              </div>

              <div className="bg-dark-750 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-400">利益率</span>
                </div>
                <div className="text-2xl font-bold">
                  {currentPlan.profitRate > 0 ? `${currentPlan.profitRate}%` : `¥${Math.abs(currentPlan.profitRate)}`}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Billing Cycle Toggle */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-dark-800/50 rounded-lg p-1 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              月額
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                billingCycle === 'yearly'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>年額</span>
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                20% OFF
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {Object.entries(planFeatures).map(([key, plan], index) => {
            const Icon = getPlanIcon(key);
            const isCurrentPlan = user.plan === key;
            const yearlyPrice = key === 'free' ? '¥0' : `¥${Math.round(parseInt(plan.price.replace('¥', '').replace(',', '')) * 12 * 0.8).toLocaleString()}`;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -5 }}
                className={`relative bg-dark-800/50 backdrop-blur-sm rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                  isCurrentPlan
                    ? 'border-purple-500 bg-purple-500/10'
                    : plan.popular
                    ? 'border-purple-400/50 hover:border-purple-400'
                    : 'border-dark-700/50 hover:border-dark-500'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2 text-sm font-medium">
                    人気プラン
                  </div>
                )}
                
                <div className={`p-6 ${plan.popular ? 'pt-14' : ''}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-${plan.color}-500/20 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-${plan.color}-400`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-gray-400">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-bold">
                      {billingCycle === 'yearly' ? yearlyPrice : plan.price}
                    </div>
                    <div className="text-sm text-gray-400">
                      {key === 'free' ? plan.period : billingCycle === 'yearly' ? '年額' : plan.period}
                    </div>
                  </div>

                  <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium ${
                    plan.watermark === '削除可能' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    透かし: {plan.watermark}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <div className="bg-purple-500/20 text-purple-400 py-3 px-4 rounded-lg text-center font-medium">
                      現在のプラン
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePlanSelect(key)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                          : 'bg-dark-700 hover:bg-dark-600 text-white'
                      }`}
                    >
                      {key === 'free' ? '無料で始める' : 'プランを選択'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* FAQ Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-6 border border-dark-700/50"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">よくある質問</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Info className="w-4 h-4 text-blue-400 mr-2" />
                処理方式の違いについて
              </h3>
              <p className="text-sm text-gray-400">
                フリープランはVPS専用、その他のプランはGCP専用で処理します。GCP専用はより高速で安定した処理を提供します。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Gift className="w-4 h-4 text-green-400 mr-2" />
                音声解析機能について
              </h3>
              <p className="text-sm text-gray-400">
                全てのプランで音声解析機能を無制限でご利用いただけます。AIによる高精度な音声解析で、音楽に合わせた精度の高い編集が可能です。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Calendar className="w-4 h-4 text-purple-400 mr-2" />
                出力本数と利益率について
              </h3>
              <p className="text-sm text-gray-400">
                プランごとに月間の出力可能本数が設定されています。より高いプランほど利益率が高く、コスト効率を重視するビジネスユーザーに最適です。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Shield className="w-4 h-4 text-yellow-400 mr-2" />
                プラン変更とアップグレード
              </h3>
              <p className="text-sm text-gray-400">
                いつでもプランをアップグレードできます。フリーからライト、スタンダード、プロまで、ご利用状況に合わせて柔軟に変更できます。
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;
