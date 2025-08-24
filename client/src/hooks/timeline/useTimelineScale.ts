import { useMemo } from 'react';

export interface TimelineScaleConfig {
  /** ズーム倍率 (0.25 - 4.0) */
  zoom: number;
  /** ベースとなる1秒あたりのピクセル数 */
  basePixelsPerSecond?: number;
  /** 最小ピクセル数 */
  minPixelsPerSecond?: number;
  /** 最大ピクセル数 */
  maxPixelsPerSecond?: number;
}

export interface TimelineScale {
  /** 1秒あたりのピクセル数 */
  pixelsPerSecond: number;
  /** 時間をピクセル位置に変換 */
  timeToPixel: (time: number) => number;
  /** ピクセル位置を時間に変換 */
  pixelToTime: (pixel: number) => number;
  /** 現在のズーム倍率 */
  zoom: number;
}

/**
 * タイムラインスケール管理用の共通フック
 * 複数のタイムラインコンポーネントで一貫したスケール計算を提供
 */
export const useTimelineScale = (config: TimelineScaleConfig): TimelineScale => {
  const {
    zoom,
    basePixelsPerSecond = 50,
    minPixelsPerSecond = 10,
    maxPixelsPerSecond = 200
  } = config;

  return useMemo(() => {
    // ズーム倍率を適用してピクセル数を計算
    const rawPixelsPerSecond = basePixelsPerSecond * zoom;
    
    // 最小・最大値でクランプ
    const pixelsPerSecond = Math.max(
      minPixelsPerSecond,
      Math.min(maxPixelsPerSecond, rawPixelsPerSecond)
    );

    return {
      pixelsPerSecond,
      timeToPixel: (time: number) => time * pixelsPerSecond,
      pixelToTime: (pixel: number) => pixel / pixelsPerSecond,
      zoom
    };
  }, [zoom, basePixelsPerSecond, minPixelsPerSecond, maxPixelsPerSecond]);
};

export default useTimelineScale;
