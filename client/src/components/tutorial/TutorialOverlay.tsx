import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronLeft, ChevronRight, Play, Pause, 
  RotateCcw, CheckCircle2, ArrowRight, Lightbulb,
  MessageCircle, Video, FileText
} from 'lucide-react';
import { Tutorial, TutorialStep } from '@/types';

interface TutorialOverlayProps {
  tutorial: Tutorial;
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

interface TutorialStepProps {
  step: TutorialStep;
  isActive: boolean;
  targetElement?: HTMLElement | null;
}

interface TutorialProgressProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}

// スタイル付きボタンコンポーネント
const TutorialButton: React.FC<{
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}> = ({ onClick, variant = 'primary', children, icon, disabled = false }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`${baseClasses} ${variants[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
};

// プログレス表示コンポーネント
const TutorialProgress: React.FC<TutorialProgressProps> = ({ 
  currentStep, 
  totalSteps, 
  completedSteps 
}) => {
  const progressPercentage = ((currentStep) / totalSteps) * 100;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">
          ステップ {currentStep} / {totalSteps}
        </span>
        <span className="text-sm text-purple-400">
          {completedSteps.length}個完了
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
      
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <motion.div
            key={index}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              completedSteps.includes(index) 
                ? 'bg-green-500' 
                : index === currentStep 
                  ? 'bg-purple-500' 
                  : 'bg-gray-600'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {completedSteps.includes(index) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-full h-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 個別ステップコンポーネント
const TutorialStepComponent: React.FC<TutorialStepProps> = ({ 
  step, 
  isActive, 
  targetElement 
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isActive && targetElement && step.target) {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 300;
      const tooltipHeight = 200;
      
      let top = rect.bottom + 10;
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

      // 画面外に出る場合の調整
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      if (top + tooltipHeight > window.innerHeight - 10) {
        top = rect.top - tooltipHeight - 10;
      }

      setPosition({ top, left });

      // ターゲット要素をハイライト
      targetElement.style.outline = '3px solid #8b5cf6';
      targetElement.style.outlineOffset = '2px';
      targetElement.style.zIndex = '9999';
      
      return () => {
        targetElement.style.outline = '';
        targetElement.style.outlineOffset = '';
        targetElement.style.zIndex = '';
      };
    }
  }, [isActive, targetElement, step.target]);

  if (!isActive) return null;

  return (
    <>
      {/* オーバーレイ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
      />
      
      {/* ツールチップ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="fixed z-[9999] bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700 max-w-sm"
        style={{ 
          top: position.top, 
          left: position.left,
          width: '300px'
        }}
      >
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {step.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {step.action && (
          <div className="mt-4 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <p className="text-sm text-purple-300">
              📝 {step.action === 'click' && 'クリックしてください'}
              {step.action === 'hover' && 'マウスをホバーしてください'}
              {step.action === 'input' && '入力してください'}
              {step.action === 'wait' && '少しお待ちください'}
            </p>
          </div>
        )}

        {/* 矢印 */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <div className="w-4 h-4 bg-gray-800 border-t border-l border-gray-700 rotate-45"></div>
        </div>
      </motion.div>
    </>
  );
};

// メインのチュートリアルオーバーレイ
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorial,
  isActive,
  onComplete,
  onSkip,
  onClose
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStep = tutorial.steps[currentStepIndex];
  const isLastStep = currentStepIndex === tutorial.steps.length - 1;

  // ターゲット要素を検索
  useEffect(() => {
    if (currentStep?.target) {
      const element = document.querySelector(currentStep.target) as HTMLElement;
      setTargetElement(element);
    } else {
      setTargetElement(null);
    }
  }, [currentStep?.target]);

  // 次のステップに進む
  const nextStep = useCallback(() => {
    if (!isLastStep) {
      setCompletedSteps(prev => [...prev, currentStepIndex]);
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setCompletedSteps(prev => [...prev, currentStepIndex]);
      onComplete();
    }
  }, [currentStepIndex, isLastStep, onComplete]);

  // 前のステップに戻る
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setCompletedSteps(prev => prev.filter(step => step !== currentStepIndex - 1));
    }
  }, [currentStepIndex]);

  // 自動再生
  const toggleAutoPlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // チュートリアルリセット
  const resetTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(nextStep, 3000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, nextStep]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9997]">
        {/* ステップ表示 */}
        <TutorialStepComponent
          step={currentStep}
          isActive={true}
          targetElement={targetElement}
        />

        {/* コントロールパネル */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700 min-w-[400px] z-[10000]"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Video className="w-5 h-5 text-purple-400" />
              <span>{tutorial.title}</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <TutorialProgress
            currentStep={currentStepIndex + 1}
            totalSteps={tutorial.steps.length}
            completedSteps={completedSteps}
          />

          <div className="flex justify-between items-center space-x-3">
            <div className="flex space-x-2">
              <TutorialButton
                onClick={prevStep}
                variant="secondary"
                disabled={currentStepIndex === 0}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                前へ
              </TutorialButton>
              
              <TutorialButton
                onClick={toggleAutoPlay}
                variant="secondary"
                icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              >
                {isPlaying ? '一時停止' : '自動再生'}
              </TutorialButton>

              <TutorialButton
                onClick={resetTutorial}
                variant="secondary"
                icon={<RotateCcw className="w-4 h-4" />}
              >
                リセット
              </TutorialButton>
            </div>

            <div className="flex space-x-2">
              <TutorialButton
                onClick={onSkip}
                variant="danger"
              >
                スキップ
              </TutorialButton>

              <TutorialButton
                onClick={nextStep}
                icon={isLastStep ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              >
                {isLastStep ? '完了' : '次へ'}
              </TutorialButton>
            </div>
          </div>

          {/* 追加情報 */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>困ったときはヘルプ</span>
                </span>
                <span className="flex items-center space-x-1">
                  <FileText className="w-4 h-4" />
                  <span>詳細ガイド</span>
                </span>
              </div>
              <span>難易度: {tutorial.difficulty === 'beginner' ? '初心者' : tutorial.difficulty === 'intermediate' ? '中級者' : '上級者'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TutorialOverlay;
