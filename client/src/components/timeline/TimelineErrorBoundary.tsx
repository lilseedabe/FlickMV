import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableReporting?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * タイムライン専用エラーバウンダリー
 * タイムライン関連のエラーを適切にキャッチし、ユーザーフレンドリーな復旧オプションを提供
 */
class TimelineErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `timeline_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // エラーレポート送信
    if (this.props.enableReporting) {
      this.reportError(error, errorInfo);
    }

    // 開発時のコンソールログ
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Timeline Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // カスタムエラーハンドラー呼び出し
    this.props.onError?.(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'anonymous', // 実際の実装では適切なユーザーIDを使用
        sessionId: sessionStorage.getItem('sessionId') || 'unknown',
        retryCount: this.retryCount
      };

      // エラーレポートAPIに送信（例）
      await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      });

      console.log('✅ Error report sent:', errorReport.errorId);
    } catch (reportError) {
      console.error('❌ Failed to send error report:', reportError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
      
      console.log(`🔄 Retrying timeline (attempt ${this.retryCount}/${this.maxRetries})`);
    }
  };

  private handleReset = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // ローカルストレージのクリア（必要に応じて）
    try {
      localStorage.removeItem('timeline-cache');
      localStorage.removeItem('timeline-state');
      console.log('🧹 Timeline cache cleared');
    } catch (e) {
      console.warn('Failed to clear timeline cache:', e);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('memory') || message.includes('heap')) {
      return 'memory';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('audio') || message.includes('waveform')) {
      return 'audio';
    }
    if (message.includes('render') || message.includes('dom')) {
      return 'rendering';
    }
    if (stack.includes('timeline') || stack.includes('snap') || stack.includes('drag')) {
      return 'timeline';
    }
    
    return 'unknown';
  };

  private getErrorSuggestions = (error: Error): string[] => {
    const category = this.getErrorCategory(error);
    
    switch (category) {
      case 'memory':
        return [
          'Try refreshing the page to free up memory',
          'Close other browser tabs to reduce memory usage',
          'Consider using fewer audio tracks or clips',
          'Clear browser cache and reload'
        ];
      
      case 'network':
        return [
          'Check your internet connection',
          'Try reloading the page',
          'Ensure audio files are accessible',
          'Contact support if the problem persists'
        ];
      
      case 'audio':
        return [
          'Check if audio files are in supported formats (MP3, WAV, AAC)',
          'Ensure audio files are not corrupted',
          'Try with smaller audio files',
          'Refresh the page and try again'
        ];
      
      case 'rendering':
        return [
          'Try reducing the zoom level',
          'Close other applications to free up resources',
          'Use a modern browser with hardware acceleration',
          'Refresh the page to reset the renderer'
        ];
      
      case 'timeline':
        return [
          'Try undoing recent actions if possible',
          'Reset timeline settings to default',
          'Save your work and refresh the page',
          'Contact support with the error details'
        ];
      
      default:
        return [
          'Try refreshing the page',
          'Save your work before proceeding',
          'Contact support if the problem continues',
          'Check browser console for more details'
        ];
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const errorCategory = error ? this.getErrorCategory(error) : 'unknown';
      const suggestions = error ? this.getErrorSuggestions(error) : [];
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-[400px] bg-dark-900 border border-red-500/30 rounded-lg flex items-center justify-center p-8">
          <div className="max-w-2xl w-full text-center space-y-6">
            {/* エラーアイコンとタイトル */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Timeline Error
                </h2>
                <p className="text-gray-400">
                  Something went wrong with the timeline component
                </p>
              </div>
            </div>

            {/* エラー詳細 */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-3">
                <Bug className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400 uppercase">
                  {errorCategory} Error
                </span>
                {this.state.errorId && (
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {this.state.errorId.slice(-8)}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-300 mb-3">
                {error?.message || 'An unknown error occurred'}
              </p>

              {this.props.showDetails && error?.stack && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 bg-dark-800 p-2 rounded overflow-auto max-h-32 font-mono">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* 提案 */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-blue-400 mb-3">
                Suggested Solutions:
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-wrap justify-center gap-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again ({this.maxRetries - this.retryCount} left)</span>
                </button>
              )}

              <button
                onClick={this.handleReset}
                className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Reset Timeline</span>
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>

            {/* サポート情報 */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                If this problem persists, please contact support with error ID: 
                <span className="font-mono ml-1">{this.state.errorId}</span>
              </p>
              <p>
                Retry count: {this.retryCount}/{this.maxRetries}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TimelineErrorBoundary;

/**
 * エラーハンドリングユーティリティ関数
 */
export const TimelineErrorUtils = {
  /**
   * 安全にJSON.parseを実行
   */
  safeJsonParse<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return fallback;
    }
  },

  /**
   * 安全にローカルストレージにアクセス
   */
  safeLocalStorage: {
    getItem: (key: string, fallback: string | null = null): string | null => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('Failed to access localStorage:', error);
        return fallback;
      }
    },

    setItem: (key: string, value: string): boolean => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn('Failed to set localStorage:', error);
        return false;
      }
    },

    removeItem: (key: string): boolean => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
        return false;
      }
    }
  },

  /**
   * 安全にAPIを呼び出し
   */
  async safeApiCall<T>(
    apiCall: () => Promise<T>,
    fallback: T,
    retries: number = 2
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        console.warn(`API call failed (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        if (attempt === retries) {
          return fallback;
        }
        
        // 指数バックオフで再試行
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return fallback;
  },

  /**
   * メモリ使用量をチェック
   */
  checkMemoryUsage: (): { isLow: boolean; usage: number } => {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        return {
          isLow: usage > 0.9,
          usage: Math.round(usage * 100)
        };
      }
    } catch (error) {
      console.warn('Failed to check memory usage:', error);
    }
    
    return { isLow: false, usage: 0 };
  },

  /**
   * エラーの分類
   */
  categorizeError: (error: Error): {
    category: string;
    severity: 'low' | 'medium' | 'high';
    recoverable: boolean;
  } => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // メモリ関連エラー
    if (message.includes('memory') || message.includes('heap')) {
      return { category: 'memory', severity: 'high', recoverable: false };
    }

    // ネットワーク関連エラー
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return { category: 'network', severity: 'medium', recoverable: true };
    }

    // 音声関連エラー
    if (message.includes('audio') || message.includes('decode')) {
      return { category: 'audio', severity: 'medium', recoverable: true };
    }

    // レンダリング関連エラー
    if (message.includes('render') || message.includes('canvas')) {
      return { category: 'rendering', severity: 'medium', recoverable: true };
    }

    // タイムライン関連エラー
    if (stack.includes('timeline') || stack.includes('snap')) {
      return { category: 'timeline', severity: 'medium', recoverable: true };
    }

    // その他
    return { category: 'unknown', severity: 'low', recoverable: true };
  }
};
