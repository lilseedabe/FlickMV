import { useCallback, useRef, useState, useEffect } from 'react';

export interface PerformanceMetrics {
  /** レンダリング時間（ミリ秒） */
  renderTime: number;
  /** フレームレート（FPS） */
  fps: number;
  /** メモリ使用量（MB） */
  memoryUsage: number;
  /** DOMノード数 */
  domNodes: number;
  /** キャッシュヒット率（%） */
  cacheHitRate: number;
  /** 最後の測定時刻 */
  timestamp: number;
}

export interface PerformanceThresholds {
  /** 最小FPS */
  minFps: number;
  /** 最大レンダリング時間（ミリ秒） */
  maxRenderTime: number;
  /** 最大メモリ使用量（MB） */
  maxMemoryUsage: number;
  /** 最大DOMノード数 */
  maxDomNodes: number;
}

export interface PerformanceConfig {
  /** 測定間隔（ミリ秒） */
  measurementInterval?: number;
  /** 履歴保持数 */
  historySize?: number;
  /** 閾値設定 */
  thresholds?: PerformanceThresholds;
  /** 警告を有効にするか */
  enableWarnings?: boolean;
  /** デバッグログを有効にするか */
  enableDebugLogs?: boolean;
}

export interface PerformanceAlert {
  type: 'fps' | 'memory' | 'render' | 'dom';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  value: number;
  threshold: number;
}

/**
 * タイムラインパフォーマンス監視フック
 * リアルタイムでのパフォーマンス測定と最適化提案
 */
export const usePerformanceMonitor = (config: PerformanceConfig = {}) => {
  const {
    measurementInterval = 1000,
    historySize = 60,
    thresholds = {
      minFps: 30,
      maxRenderTime: 16,
      maxMemoryUsage: 100,
      maxDomNodes: 1000
    },
    enableWarnings = true,
    enableDebugLogs = false
  } = config;

  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    fps: 60,
    memoryUsage: 0,
    domNodes: 0,
    cacheHitRate: 0,
    timestamp: Date.now()
  });

  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const measurementIntervalRef = useRef<number | null>(null);
  const renderStartTimeRef = useRef<number | null>(null);

  // レンダリング開始の記録
  const startRenderMeasurement = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  // レンダリング終了の記録
  const endRenderMeasurement = useCallback(() => {
    if (renderStartTimeRef.current === null) return 0;
    
    const renderTime = performance.now() - renderStartTimeRef.current;
    renderStartTimeRef.current = null;
    
    return renderTime;
  }, []);

  // FPS計算
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    frameCountRef.current++;
    
    return Math.round(1000 / deltaTime);
  }, []);

  // メモリ使用量取得
  const getMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }, []);

  // DOMノード数取得
  const getDOMNodeCount = useCallback((): number => {
    return document.querySelectorAll('*').length;
  }, []);

  // メトリクス測定
  const measureMetrics = useCallback((cacheHitRate: number = 0): PerformanceMetrics => {
    const renderTime = endRenderMeasurement();
    const fps = calculateFPS();
    const memoryUsage = getMemoryUsage();
    const domNodes = getDOMNodeCount();

    const metrics: PerformanceMetrics = {
      renderTime,
      fps,
      memoryUsage,
      domNodes,
      cacheHitRate,
      timestamp: Date.now()
    };

    setCurrentMetrics(metrics);

    // 履歴に追加
    setMetricsHistory(prev => {
      const newHistory = [...prev, metrics];
      return newHistory.slice(-historySize);
    });

    // 警告チェック
    if (enableWarnings) {
      checkThresholds(metrics);
    }

    if (enableDebugLogs) {
      console.log('📊 Performance metrics:', metrics);
    }

    return metrics;
  }, [
    endRenderMeasurement,
    calculateFPS,
    getMemoryUsage,
    getDOMNodeCount,
    historySize,
    enableWarnings,
    enableDebugLogs
  ]);

  // 閾値チェック
  const checkThresholds = useCallback((metrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // FPS チェック
    if (metrics.fps < thresholds.minFps) {
      newAlerts.push({
        type: 'fps',
        message: `Low FPS detected: ${metrics.fps} (threshold: ${thresholds.minFps})`,
        severity: metrics.fps < thresholds.minFps * 0.5 ? 'high' : 'medium',
        timestamp: Date.now(),
        value: metrics.fps,
        threshold: thresholds.minFps
      });
    }

    // レンダリング時間チェック
    if (metrics.renderTime > thresholds.maxRenderTime) {
      newAlerts.push({
        type: 'render',
        message: `Slow rendering: ${metrics.renderTime.toFixed(2)}ms (threshold: ${thresholds.maxRenderTime}ms)`,
        severity: metrics.renderTime > thresholds.maxRenderTime * 2 ? 'high' : 'medium',
        timestamp: Date.now(),
        value: metrics.renderTime,
        threshold: thresholds.maxRenderTime
      });
    }

    // メモリ使用量チェック
    if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      newAlerts.push({
        type: 'memory',
        message: `High memory usage: ${metrics.memoryUsage}MB (threshold: ${thresholds.maxMemoryUsage}MB)`,
        severity: metrics.memoryUsage > thresholds.maxMemoryUsage * 1.5 ? 'high' : 'medium',
        timestamp: Date.now(),
        value: metrics.memoryUsage,
        threshold: thresholds.maxMemoryUsage
      });
    }

    // DOMノード数チェック
    if (metrics.domNodes > thresholds.maxDomNodes) {
      newAlerts.push({
        type: 'dom',
        message: `Too many DOM nodes: ${metrics.domNodes} (threshold: ${thresholds.maxDomNodes})`,
        severity: metrics.domNodes > thresholds.maxDomNodes * 2 ? 'high' : 'low',
        timestamp: Date.now(),
        value: metrics.domNodes,
        threshold: thresholds.maxDomNodes
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts].slice(-50)); // 最新50件を保持
      
      if (enableDebugLogs) {
        newAlerts.forEach(alert => {
          console.warn(`⚠️ Performance Alert [${alert.severity}]:`, alert.message);
        });
      }
    }
  }, [thresholds, enableDebugLogs]);

  // パフォーマンス統計の計算
  const getPerformanceStats = useCallback(() => {
    if (metricsHistory.length === 0) return null;

    const recentHistory = metricsHistory.slice(-10); // 直近10回
    
    return {
      avgFps: recentHistory.reduce((sum, m) => sum + m.fps, 0) / recentHistory.length,
      avgRenderTime: recentHistory.reduce((sum, m) => sum + m.renderTime, 0) / recentHistory.length,
      avgMemoryUsage: recentHistory.reduce((sum, m) => sum + m.memoryUsage, 0) / recentHistory.length,
      currentDomNodes: recentHistory[recentHistory.length - 1]?.domNodes || 0,
      trendFps: calculateTrend(recentHistory.map(m => m.fps)),
      trendMemory: calculateTrend(recentHistory.map(m => m.memoryUsage)),
      alertCount: alerts.length,
      highSeverityAlerts: alerts.filter(a => a.severity === 'high').length
    };
  }, [metricsHistory, alerts]);

  // トレンド計算（簡易的な線形回帰）
  const calculateTrend = useCallback((values: number[]): 'improving' | 'stable' | 'degrading' => {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'degrading';
    return 'stable';
  }, []);

  // 最適化提案の生成
  const getOptimizationSuggestions = useCallback((): string[] => {
    const suggestions: string[] = [];
    const stats = getPerformanceStats();
    
    if (!stats) return suggestions;

    if (stats.avgFps < thresholds.minFps) {
      suggestions.push('Consider enabling timeline virtualization for large datasets');
      suggestions.push('Reduce the number of visible tracks or clips');
      suggestions.push('Enable waveform caching to reduce rendering overhead');
    }

    if (stats.avgRenderTime > thresholds.maxRenderTime) {
      suggestions.push('Use requestAnimationFrame throttling for drag operations');
      suggestions.push('Implement clip culling for off-screen elements');
      suggestions.push('Consider reducing visual effects complexity');
    }

    if (stats.avgMemoryUsage > thresholds.maxMemoryUsage) {
      suggestions.push('Clear unused waveform cache entries');
      suggestions.push('Limit undo/redo history size');
      suggestions.push('Use object pooling for frequently created/destroyed elements');
    }

    if (stats.currentDomNodes > thresholds.maxDomNodes) {
      suggestions.push('Enable virtual scrolling for timeline tracks');
      suggestions.push('Use CSS transforms instead of DOM manipulation');
      suggestions.push('Minimize inline styles and use CSS classes');
    }

    return suggestions;
  }, [getPerformanceStats, thresholds]);

  // 監視開始
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    measurementIntervalRef.current = window.setInterval(() => {
      measureMetrics();
    }, measurementInterval);

    if (enableDebugLogs) {
      console.log('🔍 Performance monitoring started');
    }
  }, [isMonitoring, measureMetrics, measurementInterval, enableDebugLogs]);

  // 監視停止
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    
    if (measurementIntervalRef.current !== null) {
      clearInterval(measurementIntervalRef.current);
      measurementIntervalRef.current = null;
    }

    if (enableDebugLogs) {
      console.log('⏹️ Performance monitoring stopped');
    }
  }, [isMonitoring, enableDebugLogs]);

  // アラートのクリア
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // 履歴のリセット
  const resetHistory = useCallback(() => {
    setMetricsHistory([]);
    setAlerts([]);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (measurementIntervalRef.current !== null) {
        clearInterval(measurementIntervalRef.current);
      }
    };
  }, []);

  return {
    // 現在の状態
    currentMetrics,
    metricsHistory,
    alerts,
    isMonitoring,
    
    // 測定制御
    startRenderMeasurement,
    endRenderMeasurement,
    measureMetrics,
    startMonitoring,
    stopMonitoring,
    
    // 分析
    getPerformanceStats,
    getOptimizationSuggestions,
    
    // 管理
    clearAlerts,
    resetHistory,
    
    // ユーティリティ
    isPerformanceGood: currentMetrics.fps >= thresholds.minFps && 
                       currentMetrics.renderTime <= thresholds.maxRenderTime &&
                       currentMetrics.memoryUsage <= thresholds.maxMemoryUsage
  };
};

export default usePerformanceMonitor;
