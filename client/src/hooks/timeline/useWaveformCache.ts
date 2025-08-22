import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { AudioTrack } from '@/types';

export interface WaveformCacheConfig {
  /** キャッシュサイズ上限（バイト） */
  maxCacheSize?: number;
  /** キャッシュアイテム上限数 */
  maxCacheItems?: number;
  /** 自動クリーンアップの間隔（ミリ秒） */
  cleanupInterval?: number;
  /** デバッグモード */
  debug?: boolean;
}

export interface WaveformCacheItem {
  /** キャッシュキー */
  key: string;
  /** キャッシュされたcanvas */
  canvas: HTMLCanvasElement;
  /** 作成日時 */
  createdAt: number;
  /** 最終アクセス日時 */
  lastAccessed: number;
  /** データサイズ（推定） */
  size: number;
  /** 波形の設定 */
  config: WaveformRenderConfig;
}

export interface WaveformRenderConfig {
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** 色 */
  color: string;
  /** オーディオデータ（ArrayBuffer or 波形データ） */
  audioData?: ArrayBuffer | Float32Array;
  /** サンプルレート */
  sampleRate?: number;
  /** チャンネル数 */
  channels?: number;
  /** 描画スタイル */
  style?: 'bars' | 'line' | 'filled';
  /** ビート位置 */
  beatTimes?: number[];
  /** ビート表示 */
  showBeats?: boolean;
}

/**
 * Waveformキャッシュ管理フック
 * Canvas要素をメモリにキャッシュして描画パフォーマンスを向上
 */
export const useWaveformCache = (config: WaveformCacheConfig = {}) => {
  const {
    maxCacheSize = 50 * 1024 * 1024, // 50MB
    maxCacheItems = 100,
    cleanupInterval = 60000, // 1分
    debug = false
  } = config;

  const cacheRef = useRef<Map<string, WaveformCacheItem>>(new Map());
  const [cacheStats, setCacheStats] = useState({
    itemCount: 0,
    totalSize: 0,
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0
  });

  // キャッシュキーの生成
  const generateCacheKey = useCallback((config: WaveformRenderConfig): string => {
    const {
      width,
      height,
      color,
      style = 'bars',
      showBeats = false,
      audioData
    } = config;

    // オーディオデータのハッシュ化（簡易版）
    let dataHash = 'no-data';
    if (audioData) {
      const view = audioData instanceof ArrayBuffer 
        ? new Uint8Array(audioData.slice(0, 1024)) 
        : new Uint8Array(audioData.buffer.slice(0, 1024));
      dataHash = Array.from(view).slice(0, 16).join(',');
    }

    return `${width}x${height}_${color}_${style}_${showBeats}_${dataHash}`;
  }, []);

  // キャッシュサイズの計算
  const calculateCacheSize = useCallback((canvas: HTMLCanvasElement): number => {
    return canvas.width * canvas.height * 4; // RGBA = 4 bytes per pixel
  }, []);

  // LRUクリーンアップ
  const cleanupCache = useCallback(() => {
    const cache = cacheRef.current;
    let currentSize = 0;
    const items = Array.from(cache.values());

    // サイズ計算
    items.forEach(item => {
      currentSize += item.size;
    });

    // サイズ制限またはアイテム数制限を超えている場合
    if (currentSize > maxCacheSize || items.length > maxCacheItems) {
      // 最終アクセス時間でソート（古いものから削除）
      const sortedItems = items.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      let removedSize = 0;
      let removedCount = 0;

      for (const item of sortedItems) {
        if (currentSize - removedSize <= maxCacheSize * 0.8 && 
            items.length - removedCount <= maxCacheItems * 0.8) {
          break;
        }

        cache.delete(item.key);
        removedSize += item.size;
        removedCount++;

        if (debug) {
          console.log(`🗑️ Waveform cache: removed ${item.key} (${item.size} bytes)`);
        }
      }

      if (debug && removedCount > 0) {
        console.log(`🧹 Waveform cache cleanup: removed ${removedCount} items, ${removedSize} bytes`);
      }
    }

    // 統計更新
    const finalStats = {
      itemCount: cache.size,
      totalSize: Array.from(cache.values()).reduce((sum, item) => sum + item.size, 0),
      hitRate: cacheStats.totalRequests > 0 ? cacheStats.cacheHits / cacheStats.totalRequests : 0,
      totalRequests: cacheStats.totalRequests,
      cacheHits: cacheStats.cacheHits
    };

    setCacheStats(finalStats);
  }, [maxCacheSize, maxCacheItems, debug, cacheStats]);

  // 波形レンダリング
  const renderWaveformToCanvas = useCallback((config: WaveformRenderConfig): HTMLCanvasElement => {
    const {
      width,
      height,
      color,
      audioData,
      style = 'bars',
      beatTimes = [],
      showBeats = false
    } = config;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 背景をクリア
    ctx.clearRect(0, 0, width, height);

    if (!audioData) {
      // データがない場合はプレースホルダー
      ctx.fillStyle = color + '40';
      ctx.fillRect(0, height * 0.4, width, height * 0.2);
      return canvas;
    }

    // 波形データの準備
    let waveformData: Float32Array;
    if (audioData instanceof ArrayBuffer) {
      // AudioBufferから波形データを抽出（簡易版）
      const samples = new Float32Array(audioData);
      waveformData = samples;
    } else {
      waveformData = audioData;
    }

    const samplesPerPixel = Math.ceil(waveformData.length / width);
    
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    if (style === 'bars') {
      // バー形式
      for (let x = 0; x < width; x++) {
        const start = x * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, waveformData.length);
        
        let min = 0;
        let max = 0;
        
        for (let i = start; i < end; i++) {
          const sample = waveformData[i] || 0;
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }

        const barHeight = Math.max(1, Math.abs(max - min) * height * 0.5);
        const y = (height - barHeight) * 0.5;
        
        ctx.fillRect(x, y, 1, barHeight);
      }
    } else if (style === 'line') {
      // ライン形式
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const start = x * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, waveformData.length);
        
        let avg = 0;
        let count = 0;
        
        for (let i = start; i < end; i++) {
          avg += waveformData[i] || 0;
          count++;
        }
        
        if (count > 0) {
          avg /= count;
        }

        const y = height * 0.5 - (avg * height * 0.4);
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // ビートマーカー
    if (showBeats && beatTimes.length > 0) {
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 1;
      
      // 仮想的な時間からピクセル変換（ここでは簡易版）
      const timeScale = width / 10; // 仮定：10秒分の表示
      
      beatTimes.forEach(beatTime => {
        const x = beatTime * timeScale;
        if (x >= 0 && x <= width) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      });
    }

    return canvas;
  }, []);

  // キャッシュ取得または作成
  const getWaveform = useCallback((config: WaveformRenderConfig): HTMLCanvasElement => {
    const key = generateCacheKey(config);
    const cache = cacheRef.current;

    setCacheStats(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1
    }));

    // キャッシュヒット
    if (cache.has(key)) {
      const item = cache.get(key)!;
      item.lastAccessed = Date.now();
      
      setCacheStats(prev => ({
        ...prev,
        cacheHits: prev.cacheHits + 1
      }));

      if (debug) {
        console.log(`✅ Waveform cache hit: ${key}`);
      }

      return item.canvas;
    }

    // キャッシュミス - 新規作成
    if (debug) {
      console.log(`🔄 Waveform cache miss: ${key}`);
    }

    const canvas = renderWaveformToCanvas(config);
    const size = calculateCacheSize(canvas);
    const now = Date.now();

    const cacheItem: WaveformCacheItem = {
      key,
      canvas,
      createdAt: now,
      lastAccessed: now,
      size,
      config
    };

    cache.set(key, cacheItem);

    // クリーンアップのトリガー
    setTimeout(cleanupCache, 0);

    return canvas;
  }, [generateCacheKey, renderWaveformToCanvas, calculateCacheSize, cleanupCache, debug]);

  // Canvas要素をImageData形式で取得
  const getWaveformImageData = useCallback((config: WaveformRenderConfig): ImageData => {
    const canvas = getWaveform(config);
    const ctx = canvas.getContext('2d')!;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [getWaveform]);

  // キャッシュクリア
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    setCacheStats({
      itemCount: 0,
      totalSize: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0
    });

    if (debug) {
      console.log('🧹 Waveform cache cleared');
    }
  }, [debug]);

  // 定期クリーンアップ
  useEffect(() => {
    const interval = setInterval(cleanupCache, cleanupInterval);
    return () => clearInterval(interval);
  }, [cleanupCache, cleanupInterval]);

  return {
    // メイン機能
    getWaveform,
    getWaveformImageData,
    
    // 管理機能
    clearCache,
    cleanupCache,
    
    // 統計
    cacheStats,
    
    // ユーティリティ
    generateCacheKey,
    
    // デバッグ情報
    debug: debug ? {
      getCacheContents: () => Array.from(cacheRef.current.values()),
      getCacheKeys: () => Array.from(cacheRef.current.keys()),
      getCacheItem: (key: string) => cacheRef.current.get(key)
    } : undefined
  };
};

export default useWaveformCache;
