import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

// 通知の型定義
interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number; // ミリ秒、undefinedの場合は手動で閉じる必要がある
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean; // trueの場合、自動削除されない
  timestamp: Date;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // 便利メソッド
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, persistent?: boolean) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  loading: (title: string, message?: string) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 通知アイコンコンポーネント
const NotificationIcon: React.FC<{ type: NotificationItem['type'] }> = ({ type }) => {
  const iconClasses = "w-5 h-5 flex-shrink-0";
  
  switch (type) {
    case 'success':
      return <CheckCircle className={`${iconClasses} text-green-400`} />;
    case 'error':
      return <AlertCircle className={`${iconClasses} text-red-400`} />;
    case 'warning':
      return <AlertTriangle className={`${iconClasses} text-yellow-400`} />;
    case 'info':
      return <Info className={`${iconClasses} text-blue-400`} />;
    case 'loading':
      return <Loader2 className={`${iconClasses} text-purple-400 animate-spin`} />;
    default:
      return <Info className={`${iconClasses} text-gray-400`} />;
  }
};

// 個別通知コンポーネント
const NotificationComponent: React.FC<{
  notification: NotificationItem;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const { id, type, title, message, action } = notification;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-700';
      case 'error':
        return 'bg-red-900/90 border-red-700';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700';
      case 'info':
        return 'bg-blue-900/90 border-blue-700';
      case 'loading':
        return 'bg-purple-900/90 border-purple-700';
      default:
        return 'bg-gray-900/90 border-gray-700';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`
        relative p-4 rounded-lg border backdrop-blur-sm shadow-lg min-w-[320px] max-w-[420px]
        ${getBackgroundColor()}
      `}
    >
      <div className="flex items-start space-x-3">
        <NotificationIcon type={type} />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">
            {title}
          </h4>
          {message && (
            <p className="text-sm text-gray-300 leading-relaxed">
              {message}
            </p>
          )}
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>

        {type !== 'loading' && (
          <button
            onClick={() => onRemove(id)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="通知を閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* プログレスバー（loading時） */}
      {type === 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-800 rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-purple-400"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
};

// 通知コンテナ
const NotificationContainer: React.FC<{
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationComponent
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Provider コンポーネント
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 通知を追加
  const addNotification = useCallback((
    notificationData: Omit<NotificationItem, 'id' | 'timestamp'>
  ): string => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: NotificationItem = {
      ...notificationData,
      id,
      timestamp: new Date(),
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // 最大5個まで

    // 自動削除の設定
    if (!notification.persistent && notification.type !== 'loading') {
      const duration = notification.duration || getDefaultDuration(notification.type);
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  // 通知を削除
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 全通知をクリア
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 便利メソッド
  const success = useCallback((title: string, message?: string, duration?: number): string => {
    return addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, persistent?: boolean): string => {
    return addNotification({ 
      type: 'error', 
      title, 
      message, 
      persistent,
      duration: persistent ? undefined : 8000 
    });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, duration?: number): string => {
    return addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, duration?: number): string => {
    return addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const loading = useCallback((title: string, message?: string): string => {
    return addNotification({ type: 'loading', title, message, persistent: true });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info,
    loading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

// デフォルト表示時間
function getDefaultDuration(type: NotificationItem['type']): number {
  switch (type) {
    case 'success':
      return 4000;
    case 'error':
      return 8000;
    case 'warning':
      return 6000;
    case 'info':
      return 5000;
    default:
      return 5000;
  }
}

// Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// エラーレポーティング用のHook
export const useErrorReporting = () => {
  const { error, warning } = useNotifications();

  const reportError = useCallback((
    err: Error | string,
    context?: Record<string, any>,
    userMessage?: string
  ) => {
    const errorMessage = err instanceof Error ? err.message : err;
    const errorStack = err instanceof Error ? err.stack : undefined;

    // ユーザーに表示する通知
    error(
      userMessage || 'エラーが発生しました',
      import.meta.env.MODE === 'development' ? errorMessage : '技術チームに報告されました',
      true
    );

    // エラーレポーティングサービスに送信（実際のアプリでは Sentry などを使用）
    if (import.meta.env.MODE === 'production') {
      console.error('Error reported:', {
        message: errorMessage,
        stack: errorStack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
      
      // 実際のエラーレポーティングサービスへの送信
      // 例: Sentry.captureException(err, { contexts: context });
    } else {
      console.error('Development error:', err, context);
    }
  }, [error]);

  const reportWarning = useCallback((
    message: string,
    context?: Record<string, any>
  ) => {
    warning(message);
    
    if (import.meta.env.MODE === 'development') {
      console.warn('Warning reported:', message, context);
    }
  }, [warning]);

  return {
    reportError,
    reportWarning,
  };
};

// API エラー専用のフック
export const useAPIErrorHandler = () => {
  const { reportError } = useErrorReporting();

  const handleAPIError = useCallback((
    error: any,
    context?: Record<string, any>
  ) => {
    let userMessage = 'ネットワークエラーが発生しました';
    
    if (error?.status === 401) {
      userMessage = 'ログインが必要です';
    } else if (error?.status === 403) {
      userMessage = 'アクセス権限がありません';
    } else if (error?.status === 404) {
      userMessage = 'リクエストされたリソースが見つかりません';
    } else if (error?.status >= 500) {
      userMessage = 'サーバーエラーが発生しました';
    } else if (error?.message) {
      userMessage = error.message;
    }

    reportError(error, context, userMessage);
  }, [reportError]);

  return { handleAPIError };
};

// フィードバック収集用のコンポーネント
export const FeedbackButton: React.FC = () => {
  const { info } = useNotifications();

  const handleFeedback = () => {
    info(
      'フィードバックをお聞かせください',
      'ご意見・ご要望は support@flickmv.com までお送りください',
      8000
    );
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleFeedback}
      className="fixed bottom-4 right-4 bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-colors z-40"
      aria-label="フィードバックを送信"
    >
      💭
    </motion.button>
  );
};

export default NotificationContext;
