import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Star, PlayCircle, 
  Sparkles, Video, Music, Palette, Wand2, Trophy,
  BookOpen, Users, Heart, ArrowRight
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
  onSelectTemplate: (templateId: string) => void;
  userName?: string;
}

interface WelcomeStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  action?: {
    text: string;
    onClick: () => void;
  };
}

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  isPopular?: boolean;
}> = ({ icon, title, description, isPopular = false }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
      isPopular 
        ? 'border-purple-500 bg-purple-500/10' 
        : 'border-gray-600 bg-gray-800/50 hover:border-purple-400'
    }`}
  >
    {isPopular && (
      <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
        <Star className="w-3 h-3" />
        <span>人気</span>
      </div>
    )}
    <div className="flex items-center space-x-3 mb-2">
      <div className="text-purple-400">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
    </div>
    <p className="text-gray-300 text-sm">{description}</p>
  </motion.div>
);

const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTutorial,
  onSelectTemplate,
  userName = 'ユーザー'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem('flickmv_welcome_shown');
    setHasVisited(!!visited);
  }, []);

  const steps: WelcomeStep[] = [
    {
      id: 'welcome',
      title: `ようこそ、${userName}さん！`,
      subtitle: 'FlickMVへお越しいただきありがとうございます',
      description: 'AIの力で誰でも簡単にプロレベルのミュージックビデオを作成できます。初心者でも安心して始められるよう、丁寧にサポートいたします。',
      icon: <Sparkles className="w-8 h-8" />,
      features: [
        '直感的な日本語インターフェース',
        'ステップバイステップのチュートリアル',
        'プロ品質のテンプレート',
        '24時間いつでもサポート'
      ]
    },
    {
      id: 'features',
      title: 'FlickMVでできること',
      subtitle: '創造力を解き放つ強力な機能',
      description: '音楽に合わせた動画編集から、AIによる自動エフェクトまで、プロの作品を簡単に作成できます。',
      icon: <Wand2 className="w-8 h-8" />,
      features: [
        '🎵 音楽に同期した自動編集',
        '🎨 AIによるエフェクト提案',
        '📱 モバイル対応のプレビュー',
        '☁️ クラウド保存で安心'
      ]
    },
    {
      id: 'difficulty',
      title: '難易度を選んでスタート',
      subtitle: 'あなたのレベルに合わせた体験',
      description: '初心者から上級者まで、それぞれに最適化された学習コースをご用意しています。',
      icon: <Trophy className="w-8 h-8" />,
      features: [
        '🔰 初心者コース: 基本操作から学習',
        '📈 中級者コース: 応用技術をマスター',
        '🚀 上級者コース: プロ機能を活用',
        '🎯 カスタムコース: 自分好みに設定'
      ]
    },
    {
      id: 'community',
      title: 'FlickMVコミュニティ',
      subtitle: '一緒に学び、創造しましょう',
      description: '世界中のクリエイターと繋がり、作品を共有し、インスピレーションを得ましょう。',
      icon: <Users className="w-8 h-8" />,
      features: [
        '🌟 作品ギャラリーで公開',
        '💬 Discord コミュニティ参加',
        '🏆 月間コンテスト開催',
        '📚 チュートリアル動画ライブラリ'
      ]
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGetStarted = () => {
    localStorage.setItem('flickmv_welcome_shown', 'true');
    onStartTutorial();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('flickmv_welcome_shown', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* ヘッダー */}
          <div className="relative p-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                {currentStepData.icon}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-2"
              >
                {currentStepData.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg opacity-90"
              >
                {currentStepData.subtitle}
              </motion.p>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="p-8">
            <motion.p
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-gray-300 text-lg mb-8 text-center leading-relaxed"
            >
              {currentStepData.description}
            </motion.p>

            {/* 機能グリッド */}
            <motion.div
              key={`features-${currentStep}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
            >
              {currentStepData.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                >
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-300">{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* 特別なコンテンツ (最初のステップ) */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
              >
                <FeatureCard
                  icon={<Video className="w-6 h-6" />}
                  title="AI動画編集"
                  description="音楽に合わせて自動で動画を編集"
                  isPopular
                />
                <FeatureCard
                  icon={<Music className="w-6 h-6" />}
                  title="音楽同期"
                  description="ビートに完璧に同期したエフェクト"
                />
                <FeatureCard
                  icon={<Palette className="w-6 h-6" />}
                  title="豊富なテンプレート"
                  description="プロ品質のテンプレートが使い放題"
                />
              </motion.div>
            )}

            {/* 最後のステップの特別なコンテンツ */}
            {isLastStep && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center space-x-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full mb-4">
                  <Heart className="w-4 h-4" />
                  <span>10万人以上のクリエイターが利用中</span>
                </div>
                <p className="text-gray-400 italic">
                  "FlickMVのおかげで、音楽の世界観を視覚化できました！"
                </p>
                <p className="text-sm text-gray-500 mt-1">- プロデューサー 田中様</p>
              </motion.div>
            )}
          </div>

          {/* フッター */}
          <div className="px-8 pb-8">
            {/* プログレスバー */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">
                  {currentStep + 1} / {steps.length}
                </span>
                <span className="text-sm text-purple-400">
                  {Math.round(((currentStep + 1) / steps.length) * 100)}% 完了
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>前へ</span>
                </button>

                {!hasVisited && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    スキップ
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                {isLastStep ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGetStarted}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span>チュートリアルを開始</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextStep}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all flex items-center space-x-2"
                  >
                    <span>次へ</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeModal;
