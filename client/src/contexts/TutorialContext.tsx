import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tutorial, TutorialStep, User } from '@/types';

interface TutorialContextType {
  // State
  activeTutorial: Tutorial | null;
  currentTutorialStep: number;
  isTutorialActive: boolean;
  completedTutorials: string[];
  availableTutorials: Tutorial[];
  tutorialProgress: Record<string, number>;
  
  // Actions
  startTutorial: (tutorialId: string) => void;
  stopTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  markStepComplete: (stepId: string) => void;
  resetTutorial: (tutorialId: string) => void;
  
  // Computed
  canProceedToNext: boolean;
  isLastStep: boolean;
  currentStep: TutorialStep | null;
  tutorialProgressPercentage: number;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// サンプルチュートリアルデータ
const sampleTutorials: Tutorial[] = [
  {
    id: 'getting-started',
    title: '🚀 FlickMV基本操作',
    description: 'FlickMVの基本的な使い方を学びましょう',
    duration: '5分',
    difficulty: 'beginner',
    videoUrl: 'https://example.com/tutorial-basic.mp4',
    completed: false,
    steps: [
      {
        id: 'welcome',
        title: 'FlickMVへようこそ',
        description: 'まずはダッシュボードの基本的な見方を覚えましょう',
        target: '#dashboard-main',
        position: 'bottom',
        action: 'wait'
      },
      {
        id: 'create-project',
        title: '新しいプロジェクトを作成',
        description: '「新規プロジェクト」ボタンをクリックして、最初のプロジェクトを作成しましょう',
        target: '#create-project-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'project-settings',
        title: 'プロジェクト設定',
        description: 'プロジェクト名を入力し、解像度を選択してください',
        target: '#project-settings-form',
        position: 'right',
        action: 'input'
      },
      {
        id: 'media-upload',
        title: 'メディアのアップロード',
        description: '動画や画像をドラッグ&ドロップでアップロードできます',
        target: '#media-upload-area',
        position: 'top',
        action: 'hover'
      },
      {
        id: 'timeline-basics',
        title: 'タイムライン操作',
        description: 'アップロードしたメディアをタイムラインにドラッグして配置しましょう',
        target: '#timeline-container',
        position: 'top',
        action: 'click'
      }
    ]
  },
  {
    id: 'advanced-editing',
    title: '⚡ 高度な編集技術',
    description: 'プロレベルの編集テクニックをマスターしましょう',
    duration: '15分',
    difficulty: 'intermediate',
    completed: false,
    steps: [
      {
        id: 'effects-panel',
        title: 'エフェクトパネルの使い方',
        description: '様々なエフェクトを適用して動画をより魅力的にしましょう',
        target: '#effects-panel',
        position: 'left',
        action: 'click'
      },
      {
        id: 'keyframe-animation',
        title: 'キーフレームアニメーション',
        description: 'キーフレームを使って滑らかなアニメーションを作成しましょう',
        target: '#keyframe-editor',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'color-grading',
        title: 'カラーグレーディング',
        description: '色調補正で動画の雰囲気を変えてみましょう',
        target: '#color-panel',
        position: 'right',
        action: 'click'
      }
    ]
  },
  {
    id: 'ai-features',
    title: '🤖 AI機能活用法',
    description: 'AI機能を使って効率的に動画を作成しましょう',
    duration: '10分',
    difficulty: 'intermediate',
    completed: false,
    steps: [
      {
        id: 'ai-auto-edit',
        title: 'AI自動編集',
        description: 'AIが音楽に合わせて自動的に動画を編集します',
        target: '#ai-auto-edit-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'ai-effects',
        title: 'AIエフェクト提案',
        description: 'AIがコンテンツに最適なエフェクトを提案します',
        target: '#ai-effects-panel',
        position: 'left',
        action: 'click'
      },
      {
        id: 'ai-color-match',
        title: 'AI色調マッチング',
        description: 'AIが自動で色調を統一し、プロレベルの仕上がりにします',
        target: '#ai-color-match',
        position: 'top',
        action: 'click'
      }
    ]
  }
];

interface TutorialProviderProps {
  children: ReactNode;
  user?: User | null;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children, user }) => {
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [availableTutorials, setAvailableTutorials] = useState<Tutorial[]>(sampleTutorials);
  const [tutorialProgress, setTutorialProgress] = useState<Record<string, number>>({});

  // ローカルストレージから進捗を読み込み
  useEffect(() => {
    const savedProgress = localStorage.getItem('flickmv_tutorial_progress');
    const savedCompleted = localStorage.getItem('flickmv_completed_tutorials');
    
    if (savedProgress) {
      try {
        setTutorialProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.error('Failed to parse tutorial progress:', error);
      }
    }

    if (savedCompleted) {
      try {
        setCompletedTutorials(JSON.parse(savedCompleted));
      } catch (error) {
        console.error('Failed to parse completed tutorials:', error);
      }
    }
  }, []);

  // 進捗をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('flickmv_tutorial_progress', JSON.stringify(tutorialProgress));
  }, [tutorialProgress]);

  useEffect(() => {
    localStorage.setItem('flickmv_completed_tutorials', JSON.stringify(completedTutorials));
  }, [completedTutorials]);

  // チュートリアル開始
  const startTutorial = (tutorialId: string) => {
    const tutorial = availableTutorials.find(t => t.id === tutorialId);
    if (!tutorial) {
      console.error(`Tutorial with id ${tutorialId} not found`);
      return;
    }

    setActiveTutorial(tutorial);
    setCurrentTutorialStep(0);
    setIsTutorialActive(true);

    // Analytics: チュートリアル開始をトラッキング
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tutorial_start', {
        tutorial_id: tutorialId,
        tutorial_difficulty: tutorial.difficulty
      });
    }
  };

  // チュートリアル停止
  const stopTutorial = () => {
    if (activeTutorial) {
      // 現在の進捗を保存
      setTutorialProgress(prev => ({
        ...prev,
        [activeTutorial.id]: currentTutorialStep
      }));
    }

    setActiveTutorial(null);
    setCurrentTutorialStep(0);
    setIsTutorialActive(false);
  };

  // 次のステップ
  const nextStep = () => {
    if (!activeTutorial) return;

    const nextStepIndex = currentTutorialStep + 1;
    
    if (nextStepIndex < activeTutorial.steps.length) {
      setCurrentTutorialStep(nextStepIndex);
      
      // 進捗を更新
      setTutorialProgress(prev => ({
        ...prev,
        [activeTutorial.id]: nextStepIndex
      }));
    } else {
      // チュートリアル完了
      completeTutorial();
    }
  };

  // 前のステップ
  const prevStep = () => {
    if (currentTutorialStep > 0) {
      const prevStepIndex = currentTutorialStep - 1;
      setCurrentTutorialStep(prevStepIndex);
      
      // 進捗を更新
      if (activeTutorial) {
        setTutorialProgress(prev => ({
          ...prev,
          [activeTutorial.id]: prevStepIndex
        }));
      }
    }
  };

  // チュートリアルスキップ
  const skipTutorial = () => {
    if (activeTutorial) {
      // Analytics: スキップをトラッキング
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'tutorial_skip', {
          tutorial_id: activeTutorial.id,
          step_reached: currentTutorialStep,
          total_steps: activeTutorial.steps.length
        });
      }
    }
    
    stopTutorial();
  };

  // チュートリアル完了
  const completeTutorial = () => {
    if (!activeTutorial) return;

    const tutorialId = activeTutorial.id;
    
    // 完了リストに追加
    setCompletedTutorials(prev => {
      if (!prev.includes(tutorialId)) {
        return [...prev, tutorialId];
      }
      return prev;
    });

    // 進捗を100%に設定
    setTutorialProgress(prev => ({
      ...prev,
      [tutorialId]: activeTutorial.steps.length
    }));

    // Available tutorialsを更新
    setAvailableTutorials(prev => 
      prev.map(t => 
        t.id === tutorialId 
          ? { ...t, completed: true }
          : t
      )
    );

    // Analytics: 完了をトラッキング
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tutorial_complete', {
        tutorial_id: tutorialId,
        tutorial_difficulty: activeTutorial.difficulty,
        duration: activeTutorial.duration
      });
    }

    // チュートリアル終了
    setActiveTutorial(null);
    setCurrentTutorialStep(0);
    setIsTutorialActive(false);

    // 完了通知（オプション）
    console.log(`Tutorial "${activeTutorial.title}" completed!`);
  };

  // ステップ完了マーク
  const markStepComplete = (stepId: string) => {
    if (!activeTutorial) return;

    const stepIndex = activeTutorial.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1 && stepIndex === currentTutorialStep) {
      nextStep();
    }
  };

  // チュートリアルリセット
  const resetTutorial = (tutorialId: string) => {
    setTutorialProgress(prev => ({
      ...prev,
      [tutorialId]: 0
    }));

    setCompletedTutorials(prev => prev.filter(id => id !== tutorialId));

    setAvailableTutorials(prev => 
      prev.map(t => 
        t.id === tutorialId 
          ? { ...t, completed: false }
          : t
      )
    );

    // 現在のチュートリアルがリセット対象の場合
    if (activeTutorial?.id === tutorialId) {
      setCurrentTutorialStep(0);
    }
  };

  // 計算されたプロパティ
  const canProceedToNext = true; // 実際の実装では条件をチェック
  const isLastStep = activeTutorial ? currentTutorialStep === activeTutorial.steps.length - 1 : false;
  const currentStep = activeTutorial ? activeTutorial.steps[currentTutorialStep] : null;
  const tutorialProgressPercentage = activeTutorial 
    ? Math.round((currentTutorialStep / activeTutorial.steps.length) * 100)
    : 0;

  const value: TutorialContextType = {
    // State
    activeTutorial,
    currentTutorialStep,
    isTutorialActive,
    completedTutorials,
    availableTutorials,
    tutorialProgress,
    
    // Actions
    startTutorial,
    stopTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    markStepComplete,
    resetTutorial,
    
    // Computed
    canProceedToNext,
    isLastStep,
    currentStep,
    tutorialProgressPercentage
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// チュートリアル推奨システム
export const useTutorialRecommendations = (user?: User | null) => {
  const { availableTutorials, completedTutorials } = useTutorial();

  const getRecommendedTutorials = (): Tutorial[] => {
    if (!user) return [];

    const incompleteTutorials = availableTutorials.filter(
      tutorial => !completedTutorials.includes(tutorial.id)
    );

    // ユーザーのプランとレベルに基づいた推奨
    let recommendations = incompleteTutorials;

    // 初心者ユーザーには基本チュートリアルを優先
    if (user.usage.totalExports < 5) {
      recommendations = recommendations.filter(t => t.difficulty === 'beginner');
    }

    // プロプラン以上にはAI機能チュートリアルを推奨
    if (user.plan === 'pro') {
      const aiTutorials = recommendations.filter(t => t.id.includes('ai'));
      const otherTutorials = recommendations.filter(t => !t.id.includes('ai'));
      recommendations = [...aiTutorials, ...otherTutorials];
    }

    return recommendations.slice(0, 3); // 最大3つまで推奨
  };

  return {
    recommendedTutorials: getRecommendedTutorials(),
    hasRecommendations: getRecommendedTutorials().length > 0
  };
};

export default TutorialContext;
