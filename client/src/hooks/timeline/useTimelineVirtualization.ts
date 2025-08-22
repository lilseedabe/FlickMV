import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface VirtualizationConfig {
  /** 表示領域の幅 */
  containerWidth: number;
  /** 表示領域の高さ */
  containerHeight: number;
  /** アイテムの高さ */
  itemHeight: number;
  /** 総アイテム数 */
  totalItems: number;
  /** バッファサイズ（前後に余分に描画するアイテム数） */
  bufferSize?: number;
  /** スクロール位置 */
  scrollTop?: number;
  /** 水平スクロール位置 */
  scrollLeft?: number;
  /** 総コンテンツ幅 */
  totalWidth?: number;
}

export interface VirtualizedRange {
  /** 開始インデックス */
  startIndex: number;
  /** 終了インデックス */
  endIndex: number;
  /** 実際に描画するアイテム数 */
  visibleCount: number;
  /** 上部のオフセット */
  offsetTop: number;
  /** 左側のオフセット */
  offsetLeft: number;
}

export interface TimelineVirtualizationConfig extends VirtualizationConfig {
  /** 1秒あたりのピクセル数 */
  pixelsPerSecond: number;
  /** タイムライン総時間 */
  timelineDuration: number;
  /** 時間分割単位（秒） */
  timeChunkSize?: number;
}

export interface TimelineVirtualizedRange extends VirtualizedRange {
  /** 表示開始時間 */
  startTime: number;
  /** 表示終了時間 */
  endTime: number;
  /** 時間範囲の幅（ピクセル） */
  timeRangeWidth: number;
}

/**
 * 垂直方向（トラック）の仮想化フック
 */
export const useVerticalVirtualization = (config: VirtualizationConfig): VirtualizedRange => {
  const {
    containerHeight,
    itemHeight,
    totalItems,
    bufferSize = 3,
    scrollTop = 0
  } = config;

  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + bufferSize * 2);
    
    return {
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex + 1,
      offsetTop: startIndex * itemHeight,
      offsetLeft: 0
    };
  }, [containerHeight, itemHeight, totalItems, bufferSize, scrollTop]);
};

/**
 * 水平方向（時間軸）の仮想化フック
 */
export const useHorizontalTimelineVirtualization = (config: TimelineVirtualizationConfig): TimelineVirtualizedRange => {
  const {
    containerWidth,
    scrollLeft = 0,
    pixelsPerSecond,
    timelineDuration,
    timeChunkSize = 10 // 10秒単位で分割
  } = config;

  return useMemo(() => {
    // 現在の表示時間範囲を計算
    const startTime = Math.max(0, scrollLeft / pixelsPerSecond);
    const visibleDuration = containerWidth / pixelsPerSecond;
    const endTime = Math.min(timelineDuration, startTime + visibleDuration);

    // バッファを考慮した範囲
    const bufferTime = timeChunkSize;
    const bufferedStartTime = Math.max(0, startTime - bufferTime);
    const bufferedEndTime = Math.min(timelineDuration, endTime + bufferTime);

    // チャンクインデックスの計算
    const startChunkIndex = Math.floor(bufferedStartTime / timeChunkSize);
    const endChunkIndex = Math.floor(bufferedEndTime / timeChunkSize);

    return {
      startIndex: startChunkIndex,
      endIndex: endChunkIndex,
      visibleCount: endChunkIndex - startChunkIndex + 1,
      offsetTop: 0,
      offsetLeft: startChunkIndex * timeChunkSize * pixelsPerSecond,
      startTime: bufferedStartTime,
      endTime: bufferedEndTime,
      timeRangeWidth: (bufferedEndTime - bufferedStartTime) * pixelsPerSecond
    };
  }, [containerWidth, scrollLeft, pixelsPerSecond, timelineDuration, timeChunkSize]);
};

/**
 * スクロール状態管理フック
 */
export const useVirtualScrolling = () => {
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    scrollLeft: 0,
    isScrolling: false
  });

  const scrollTimeoutRef = useRef<number | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    
    setScrollState(prev => ({
      ...prev,
      scrollTop: target.scrollTop,
      scrollLeft: target.scrollLeft,
      isScrolling: true
    }));

    // スクロール終了検知
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setScrollState(prev => ({
        ...prev,
        isScrolling: false
      }));
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollState,
    handleScroll
  };
};

/**
 * タイムライン専用の包括的仮想化フック
 */
export const useTimelineVirtualization = (config: {
  containerWidth: number;
  containerHeight: number;
  trackHeight: number;
  totalTracks: number;
  pixelsPerSecond: number;
  timelineDuration: number;
  scrollTop?: number;
  scrollLeft?: number;
}) => {
  const {
    containerWidth,
    containerHeight,
    trackHeight,
    totalTracks,
    pixelsPerSecond,
    timelineDuration,
    scrollTop = 0,
    scrollLeft = 0
  } = config;

  // 垂直仮想化（トラック）
  const verticalRange = useVerticalVirtualization({
    containerWidth,
    containerHeight,
    itemHeight: trackHeight,
    totalItems: totalTracks,
    scrollTop
  });

  // 水平仮想化（時間軸）
  const horizontalRange = useHorizontalTimelineVirtualization({
    containerWidth,
    containerHeight,
    itemHeight: trackHeight,
    totalItems: totalTracks,
    pixelsPerSecond,
    timelineDuration,
    scrollLeft
  });

  // クリップの可視性判定
  const isClipVisible = useCallback((
    clipStartTime: number,
    clipDuration: number,
    clipLayer: number
  ): boolean => {
    // 時間軸での可視性
    const clipEndTime = clipStartTime + clipDuration;
    const timeVisible = !(clipEndTime < horizontalRange.startTime || clipStartTime > horizontalRange.endTime);

    // レイヤーでの可視性
    const layerVisible = clipLayer >= verticalRange.startIndex && clipLayer <= verticalRange.endIndex;

    return timeVisible && layerVisible;
  }, [horizontalRange, verticalRange]);

  // 表示すべきクリップのフィルタリング
  const getVisibleClips = useCallback(<T extends { startTime: number; duration: number; layer: number }>(
    clips: T[]
  ): T[] => {
    return clips.filter(clip => isClipVisible(clip.startTime, clip.duration, clip.layer));
  }, [isClipVisible]);

  // 仮想スクロールエリアのスタイル
  const scrollAreaStyle = useMemo(() => ({
    height: totalTracks * trackHeight,
    width: timelineDuration * pixelsPerSecond,
    position: 'relative' as const
  }), [totalTracks, trackHeight, timelineDuration, pixelsPerSecond]);

  // 可視領域のスタイル
  const visibleAreaStyle = useMemo(() => ({
    transform: `translate(${horizontalRange.offsetLeft}px, ${verticalRange.offsetTop}px)`,
    width: horizontalRange.timeRangeWidth,
    height: verticalRange.visibleCount * trackHeight
  }), [horizontalRange, verticalRange, trackHeight]);

  return {
    // 範囲情報
    verticalRange,
    horizontalRange,
    
    // ユーティリティ
    isClipVisible,
    getVisibleClips,
    
    // スタイル
    scrollAreaStyle,
    visibleAreaStyle,
    
    // 統計
    stats: {
      totalTracks,
      visibleTracks: verticalRange.visibleCount,
      totalDuration: timelineDuration,
      visibleDuration: horizontalRange.endTime - horizontalRange.startTime,
      renderingEfficiency: `${Math.round((verticalRange.visibleCount / totalTracks) * 100)}%`
    }
  };
};

export default useTimelineVirtualization;
