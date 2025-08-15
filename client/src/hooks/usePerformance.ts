import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAdaptiveLoading } from './useResponsive';

// 仮想化リストのためのフック
export const useVirtualization = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index,
      offsetY: (visibleRange.startIndex + index) * itemHeight,
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange,
  };
};

// 遅延読み込みフック
export const useLazyLoading = (
  options: {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
  } = {}
) => {
  const { threshold = 0.1, rootMargin = '50px', triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setIsVisible(isIntersecting);
        
        if (isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true);
        }

        if (triggerOnce && hasBeenVisible && !isIntersecting) {
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasBeenVisible]);

  const shouldLoad = triggerOnce ? hasBeenVisible : isVisible;

  return {
    ref: elementRef,
    isVisible,
    hasBeenVisible,
    shouldLoad,
  };
};

// 画像遅延読み込みフック
export const useLazyImage = (
  src: string,
  options: {
    placeholder?: string;
    threshold?: number;
    rootMargin?: string;
  } = {}
) => {
  const { placeholder, ...lazyOptions } = options;
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { shouldLoad, ref } = useLazyLoading(lazyOptions);

  useEffect(() => {
    if (shouldLoad && src && !isLoaded && !hasError) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setHasError(true);
      };
      
      img.src = src;
    }
  }, [shouldLoad, src, isLoaded, hasError]);

  return {
    ref,
    src: imageSrc,
    isLoaded,
    hasError,
    shouldLoad,
  };
};

// デバウンスフック
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// スロットルフック
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

// メモ化されたコンポーネント選択フック
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

// レンダリング最適化フック
export const useRenderOptimization = () => {
  const { optimizationLevel, shouldReduceAnimations } = useAdaptiveLoading();
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
  });

  const shouldSkipRender = useCallback((condition: boolean) => {
    return optimizationLevel === 'high' && condition;
  }, [optimizationLevel]);

  const getOptimizedProps = useCallback((baseProps: Record<string, any>) => {
    if (optimizationLevel === 'high') {
      // 高度な最適化: アニメーションを無効化
      return {
        ...baseProps,
        transition: shouldReduceAnimations ? { duration: 0 } : baseProps.transition,
        animate: shouldReduceAnimations ? {} : baseProps.animate,
      };
    }
    return baseProps;
  }, [optimizationLevel, shouldReduceAnimations]);

  return {
    renderCount: renderCountRef.current,
    optimizationLevel,
    shouldSkipRender,
    getOptimizedProps,
    shouldReduceAnimations,
  };
};

// ワーカー管理フック
export const useWebWorker = (
  workerScript: string,
  options: { 
    dependencies?: string[];
    timeout?: number;
  } = {}
) => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const workerInstance = new Worker(workerScript);
      
      workerInstance.onmessage = (e) => {
        if (e.data.type === 'ready') {
          setIsReady(true);
        }
      };

      workerInstance.onerror = (e) => {
        setError(e.message);
      };

      setWorker(workerInstance);

      return () => {
        workerInstance.terminate();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Worker creation failed');
    }
  }, [workerScript]);

  const postMessage = useCallback((data: any) => {
    if (worker && isReady) {
      worker.postMessage(data);
    }
  }, [worker, isReady]);

  const postMessageWithCallback = useCallback((
    data: any,
    callback: (result: any) => void,
    timeout: number = options.timeout || 5000
  ) => {
    if (!worker || !isReady) return;

    const messageId = Math.random().toString(36).substr(2, 9);
    const timeoutId = setTimeout(() => {
      callback({ error: 'Worker timeout' });
    }, timeout);

    const handleMessage = (e: MessageEvent) => {
      if (e.data.id === messageId) {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handleMessage);
        callback(e.data.result);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ ...data, id: messageId });
  }, [worker, isReady, options.timeout]);

  return {
    worker,
    isReady,
    error,
    postMessage,
    postMessageWithCallback,
  };
};

// キャッシュ管理フック
export const useCache = <T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: {
    ttl?: number; // Time to live in milliseconds
    staleWhileRevalidate?: boolean;
  } = {}
) => {
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const isStale = Date.now() - lastFetch > ttl;

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cachedData = localStorage.getItem(`cache_${key}`);
    const cachedTimestamp = localStorage.getItem(`cache_${key}_timestamp`);

    // キャッシュが有効で、強制更新でない場合
    if (!forceRefresh && cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (Date.now() - timestamp < ttl) {
        try {
          const parsed = JSON.parse(cachedData);
          setData(parsed);
          setLastFetch(timestamp);
          return parsed;
        } catch {
          // キャッシュが破損している場合は削除
          localStorage.removeItem(`cache_${key}`);
          localStorage.removeItem(`cache_${key}_timestamp`);
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      setData(result);
      setLastFetch(Date.now());

      // キャッシュに保存
      localStorage.setItem(`cache_${key}`, JSON.stringify(result));
      localStorage.setItem(`cache_${key}_timestamp`, Date.now().toString());

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, fetchFunction, ttl]);

  // 初回読み込み
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // stale-while-revalidate パターン
  useEffect(() => {
    if (staleWhileRevalidate && isStale && data) {
      fetchData(true).catch(() => {
        // サイレントに失敗（既存のデータを保持）
      });
    }
  }, [staleWhileRevalidate, isStale, data, fetchData]);

  const invalidateCache = useCallback(() => {
    localStorage.removeItem(`cache_${key}`);
    localStorage.removeItem(`cache_${key}_timestamp`);
    setData(null);
    setLastFetch(0);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    isStale,
    refetch: () => fetchData(true),
    invalidateCache,
  };
};

// バッチ処理フック
export const useBatchProcessor = <T, R>(
  processor: (items: T[]) => Promise<R[]>,
  options: {
    batchSize?: number;
    delay?: number;
    maxWait?: number;
  } = {}
) => {
  const { batchSize = 10, delay = 100, maxWait = 1000 } = options;
  const [queue, setQueue] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout>();

  const processBatch = useCallback(async () => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    const batch = queue.slice(0, batchSize);
    setQueue(prev => prev.slice(batchSize));

    try {
      await processor(batch);
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [queue, batchSize, processor]);

  const addItem = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);

    // 遅延処理をクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 最大待機時間のタイマーを設定
    if (!maxWaitTimeoutRef.current) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        processBatch();
        maxWaitTimeoutRef.current = undefined;
      }, maxWait);
    }

    // バッチサイズに達したら即座に処理
    if (queue.length + 1 >= batchSize) {
      processBatch();
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = undefined;
      }
    } else {
      // 遅延処理を設定
      timeoutRef.current = setTimeout(() => {
        processBatch();
        if (maxWaitTimeoutRef.current) {
          clearTimeout(maxWaitTimeoutRef.current);
          maxWaitTimeoutRef.current = undefined;
        }
      }, delay);
    }
  }, [queue.length, batchSize, delay, maxWait, processBatch]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = undefined;
    }
    processBatch();
  }, [processBatch]);

  return {
    addItem,
    flush,
    queueLength: queue.length,
    isProcessing,
  };
};

export default {
  useVirtualization,
  useLazyLoading,
  useLazyImage,
  useDebounce,
  useThrottle,
  useMemoizedCallback,
  useRenderOptimization,
  useWebWorker,
  useCache,
  useBatchProcessor,
};
