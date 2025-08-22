import { useMemo, useCallback } from 'react';
import type { BPMAnalysis, BeatGrid } from '@/types';

export interface SnapConfig {
  /** スナップが有効かどうか */
  enabled: boolean;
  /** BPM解析結果 */
  bpmAnalysis?: BPMAnalysis;
  /** ビートグリッド設定 */
  beatGrid?: BeatGrid;
  /** ピクセル/秒のスケール */
  pixelsPerSecond: number;
  /** タイムライン総時間 */
  timelineDuration: number;
  /** 手動スナップポイント */
  customSnapPoints?: number[];
}

export interface SnapResult {
  /** スナップされた時間 */
  snappedTime: number;
  /** 元の時間からスナップしたかどうか */
  wasSnapped: boolean;
  /** スナップに使用されたポイント */
  snapPoint?: number;
  /** スナップの種類 */
  snapType?: 'beat' | 'bar' | 'subdivision' | 'custom';
}

/**
 * タイムラインスナップ機能の共通フック
 * quantizeStrengthやBPMベースの適応的閾値を提供
 */
export const useTimelineSnap = (config: SnapConfig) => {
  const {
    enabled,
    bpmAnalysis,
    beatGrid,
    pixelsPerSecond,
    timelineDuration,
    customSnapPoints = []
  } = config;

  // スナップポイントの計算
  const snapPoints = useMemo(() => {
    const points: Array<{ time: number; type: 'beat' | 'bar' | 'subdivision' | 'custom' }> = [];

    if (!enabled || !beatGrid) return points;

    // ビートスナップ
    if (beatGrid.snapToBeat && bpmAnalysis?.beatTimes) {
      bpmAnalysis.beatTimes.forEach(time => {
        points.push({ time, type: 'beat' });
      });
    }

    // 小節スナップ
    if (beatGrid.snapToBar && bpmAnalysis?.bars) {
      bpmAnalysis.bars.forEach(time => {
        points.push({ time, type: 'bar' });
      });
    }

    // サブディビジョンスナップ
    if (beatGrid.subdivisions > 1 && bpmAnalysis) {
      const subdivisionInterval = 60 / (bpmAnalysis.bpm * beatGrid.subdivisions);
      for (let t = 0; t <= timelineDuration; t += subdivisionInterval) {
        const time = Number(t.toFixed(4));
        points.push({ time, type: 'subdivision' });
      }
    }

    // カスタムスナップポイント
    customSnapPoints.forEach(time => {
      points.push({ time, type: 'custom' });
    });

    // 時間順にソート（重複除去）
    const uniquePoints = points
      .sort((a, b) => a.time - b.time)
      .filter((point, index, arr) => 
        index === 0 || Math.abs(point.time - arr[index - 1].time) > 0.001
      );

    return uniquePoints;
  }, [enabled, bpmAnalysis, beatGrid, timelineDuration, customSnapPoints]);

  // 適応的スナップ距離の計算
  const calculateSnapDistance = useCallback((targetTime: number): number => {
    if (!enabled || !beatGrid || !bpmAnalysis) {
      return 0.1; // フォールバック: 100ms
    }

    // BPMベースの基本距離（1/16拍分を基準）
    const baseBeatDuration = 60 / bpmAnalysis.bpm; // 1拍の長さ
    const baseSnapDistance = baseBeatDuration / 16; // 1/16拍

    // quantizeStrengthに基づく調整 (0.0-1.0)
    // 強度が高いほど広い範囲でスナップ、低いほど狭い範囲
    const strengthMultiplier = 0.2 + (beatGrid.quantizeStrength * 0.8);
    const adaptiveDistance = baseSnapDistance * strengthMultiplier * 4; // 最大1/4拍まで

    // ピクセル換算での最小/最大制限
    const minDistanceInSeconds = 10 / pixelsPerSecond; // 最小10px
    const maxDistanceInSeconds = 50 / pixelsPerSecond; // 最大50px

    return Math.max(
      minDistanceInSeconds,
      Math.min(maxDistanceInSeconds, adaptiveDistance)
    );
  }, [enabled, beatGrid, bpmAnalysis, pixelsPerSecond]);

  // 最近接スナップポイントを検索
  const findNearestSnapPoint = useCallback((time: number): SnapResult => {
    const clampedTime = Math.max(0, Math.min(time, timelineDuration));

    if (!enabled || snapPoints.length === 0) {
      return {
        snappedTime: clampedTime,
        wasSnapped: false
      };
    }

    const snapDistance = calculateSnapDistance(time);
    let nearestPoint: typeof snapPoints[0] | null = null;
    let minDistance = snapDistance;

    // 最も近いスナップポイントを検索
    for (const point of snapPoints) {
      const distance = Math.abs(clampedTime - point.time);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    }

    if (nearestPoint) {
      return {
        snappedTime: Math.max(0, Math.min(nearestPoint.time, timelineDuration)),
        wasSnapped: true,
        snapPoint: nearestPoint.time,
        snapType: nearestPoint.type
      };
    }

    return {
      snappedTime: clampedTime,
      wasSnapped: false
    };
  }, [enabled, snapPoints, timelineDuration, calculateSnapDistance]);

  // スナップ予告表示用のポイント検索
  const getSnapPreview = useCallback((time: number): number | null => {
    const result = findNearestSnapPoint(time);
    return result.wasSnapped ? result.snappedTime : null;
  }, [findNearestSnapPoint]);

  // ビジュアル用のスナップポイント一覧
  const visualSnapPoints = useMemo(() => {
    return snapPoints.map(point => ({
      time: point.time,
      type: point.type,
      x: point.time * pixelsPerSecond
    }));
  }, [snapPoints, pixelsPerSecond]);

  return {
    snapPoints: visualSnapPoints,
    findNearestSnapPoint,
    getSnapPreview,
    calculateSnapDistance,
    isEnabled: enabled && snapPoints.length > 0
  };
};

export default useTimelineSnap;
