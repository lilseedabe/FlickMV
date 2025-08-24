import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import './styles/globals.css';

// Context Providers
import { UserProvider } from './contexts/UserContext';
import { TutorialProvider } from './contexts/TutorialContext';

// Pages
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import EditorEnhanced from './pages/EditorEnhanced';
import Login from './pages/Login';
import Pricing from './pages/Pricing';

// Layout Components
import Navbar from './components/layout/Navbar';
import LoadingScreen from './components/ui/LoadingScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Tutorial Components
import WelcomeModal from './components/tutorial/WelcomeModal';
import TutorialOverlay from './components/tutorial/TutorialOverlay';

// Hooks
import { useUser } from './contexts/UserContext';
import { useTutorial } from './contexts/TutorialContext';

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // 認証エラーの場合はリトライしない
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 10 * 60 * 1000, // 10分
    },
    mutations: {
      retry: false,
    },
  },
});

// メインアプリコンポーネント（Contextと統合）
const AppContent: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const { 
    activeTutorial, 
    isTutorialActive,
    startTutorial,
    stopTutorial,
    completeTutorial,
    skipTutorial 
  } = useTutorial();
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // 初回訪問チェック
  useEffect(() => {
    const hasVisited = localStorage.getItem('flickmv_welcome_shown');
    const isNewUser = user && user.usage.totalExports === 0;
    
    if (!hasVisited && isNewUser) {
      setIsFirstVisit(true);
      setShowWelcomeModal(true);
    }
  }, [user]);

  // チュートリアル開始ハンドラー
  const handleStartTutorial = () => {
    setShowWelcomeModal(false);
    // 基本チュートリアルを開始
    startTutorial('getting-started');
  };

  // ウェルカムモーダルを閉じる
  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
  };

  // テンプレート選択ハンドラー
  const handleSelectTemplate = (templateId: string) => {
    // テンプレート選択ロジック
    console.log('Selected template:', templateId);
    setShowWelcomeModal(false);
  };

  // ローディング画面
  if (userLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="App min-h-screen bg-dark-900 text-white">
      <Router>
        <div className="flex flex-col h-screen">
          <Navbar />
          <main className="flex-1 overflow-auto relative scrollbar-thin">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/editor/:projectId?" element={<Editor />} />
                <Route path="/editor-v2/:projectId?" element={<EditorEnhanced />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/login" element={<Login />} />
              </Routes>
            </AnimatePresence>

            {/* ウェルカムモーダル */}
            <WelcomeModal
              isOpen={showWelcomeModal}
              onClose={handleCloseWelcome}
              onStartTutorial={handleStartTutorial}
              onSelectTemplate={handleSelectTemplate}
              userName={user?.name}
            />

            {/* チュートリアルオーバーレイ */}
            {isTutorialActive && activeTutorial && (
              <TutorialOverlay
                tutorial={activeTutorial}
                isActive={isTutorialActive}
                onComplete={completeTutorial}
                onSkip={skipTutorial}
                onClose={stopTutorial}
              />
            )}
          </main>
        </div>
      </Router>
    </div>
  );
};

// メインAppコンポーネント
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <TutorialProvider>
            <AppContent />
          </TutorialProvider>
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
