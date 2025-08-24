import { useState, useCallback, useMemo } from 'react';
import type { Timeline, TimelineClip, AudioTrack } from '@/types';

export interface TrackState {
  /** トラックの高さ設定 */
  height: number;
  /** 折りたたみ状態 */
  collapsed: boolean;
  /** ミュート状態 */
  muted: boolean;
  /** ソロ状態 */
  solo: boolean;
  /** カラータグ */
  colorTag?: string;
  /** 表示順序 */
  order: number;
}

export interface TrackManagerConfig {
  /** 初期タイムライン */
  timeline: Timeline;
  /** タイムライン更新コールバック */
  onTimelineUpdate: (timeline: Timeline) => void;
  /** デフォルトトラック高さ */
  defaultTrackHeight?: number;
  /** 最小トラック高さ */
  minTrackHeight?: number;
  /** 最大トラック高さ */
  maxTrackHeight?: number;
}

export interface TrackManagerState {
  /** ビデオトラック状態 */
  videoTracks: Record<number, TrackState>;
  /** オーディオトラック状態 */
  audioTracks: Record<string, TrackState>;
  /** ソロ中のトラック数 */
  soloCount: number;
  /** 全体の表示モード */
  viewMode: 'normal' | 'dense' | 'focus';
}

/**
 * トラック状態管理の共通フック
 * 高さ調整、折りたたみ、ソロ・ミュート、色タグなどを統合管理
 */
export const useTrackManager = (config: TrackManagerConfig) => {
  const {
    timeline,
    onTimelineUpdate,
    defaultTrackHeight = 80,
    minTrackHeight = 40,
    maxTrackHeight = 160
  } = config;

  const [trackStates, setTrackStates] = useState<TrackManagerState>(() => {
    // 初期状態の生成
    const videoTracks: Record<number, TrackState> = {};
    const audioTracks: Record<string, TrackState> = {};

    // ビデオトラック（レイヤー）の初期化
    for (let i = 0; i < 5; i++) { // 最大5レイヤー
      videoTracks[i] = {
        height: defaultTrackHeight,
        collapsed: false,
        muted: false,
        solo: false,
        order: i
      };
    }

    // オーディオトラックの初期化
    timeline.audioTracks.forEach((track, index) => {
      audioTracks[track.id] = {
        height: defaultTrackHeight,
        collapsed: false,
        muted: track.muted || false,
        solo: false,
        order: index
      };
    });

    return {
      videoTracks,
      audioTracks,
      soloCount: 0,
      viewMode: 'normal'
    };
  });

  // ソロ状態の計算
  const soloCount = useMemo(() => {
    let count = 0;
    Object.values(trackStates.videoTracks).forEach(state => {
      if (state.solo) count++;
    });
    Object.values(trackStates.audioTracks).forEach(state => {
      if (state.solo) count++;
    });
    return count;
  }, [trackStates.videoTracks, trackStates.audioTracks]);

  // 実際のミュート状態（ソロを考慮）
  const getEffectiveMuteState = useCallback((trackId: string | number, type: 'video' | 'audio'): boolean => {
    const trackState = type === 'video' 
      ? trackStates.videoTracks[trackId as number]
      : trackStates.audioTracks[trackId as string];
    
    if (!trackState) return false;

    // ソロトラックがある場合
    if (soloCount > 0) {
      return !trackState.solo; // ソロでないトラックはミュート
    }

    return trackState.muted;
  }, [trackStates, soloCount]);

  // ビデオトラック状態更新
  const updateVideoTrackState = useCallback((layer: number, updates: Partial<TrackState>) => {
    setTrackStates(prev => ({
      ...prev,
      videoTracks: {
        ...prev.videoTracks,
        [layer]: {
          ...prev.videoTracks[layer],
          ...updates
        }
      }
    }));
  }, []);

  // オーディオトラック状態更新
  const updateAudioTrackState = useCallback((trackId: string, updates: Partial<TrackState>) => {
    setTrackStates(prev => ({
      ...prev,
      audioTracks: {
        ...prev.audioTracks,
        [trackId]: {
          ...prev.audioTracks[trackId],
          ...updates
        }
      }
    }));

    // オーディオトラックのミュート状態をタイムラインに反映
    if ('muted' in updates) {
      const updatedAudioTracks = timeline.audioTracks.map(track =>
        track.id === trackId ? { ...track, muted: updates.muted } : track
      );

      onTimelineUpdate({
        ...timeline,
        audioTracks: updatedAudioTracks
      });
    }
  }, [timeline, onTimelineUpdate]);

  // トラック高さ設定
  const setTrackHeight = useCallback((trackId: string | number, type: 'video' | 'audio', height: number) => {
    const clampedHeight = Math.max(minTrackHeight, Math.min(maxTrackHeight, height));
    
    if (type === 'video') {
      updateVideoTrackState(trackId as number, { height: clampedHeight });
    } else {
      updateAudioTrackState(trackId as string, { height: clampedHeight });
    }
  }, [minTrackHeight, maxTrackHeight, updateVideoTrackState, updateAudioTrackState]);

  // 折りたたみ切り替え
  const toggleCollapse = useCallback((trackId: string | number, type: 'video' | 'audio') => {
    if (type === 'video') {
      const current = trackStates.videoTracks[trackId as number]?.collapsed || false;
      updateVideoTrackState(trackId as number, { collapsed: !current });
    } else {
      const current = trackStates.audioTracks[trackId as string]?.collapsed || false;
      updateAudioTrackState(trackId as string, { collapsed: !current });
    }
  }, [trackStates, updateVideoTrackState, updateAudioTrackState]);

  // ミュート切り替え
  const toggleMute = useCallback((trackId: string | number, type: 'video' | 'audio') => {
    if (type === 'video') {
      const current = trackStates.videoTracks[trackId as number]?.muted || false;
      updateVideoTrackState(trackId as number, { muted: !current });
    } else {
      const current = trackStates.audioTracks[trackId as string]?.muted || false;
      updateAudioTrackState(trackId as string, { muted: !current });
    }
  }, [trackStates, updateVideoTrackState, updateAudioTrackState]);

  // ソロ切り替え
  const toggleSolo = useCallback((trackId: string | number, type: 'video' | 'audio') => {
    if (type === 'video') {
      const current = trackStates.videoTracks[trackId as number]?.solo || false;
      updateVideoTrackState(trackId as number, { solo: !current });
    } else {
      const current = trackStates.audioTracks[trackId as string]?.solo || false;
      updateAudioTrackState(trackId as string, { solo: !current });
    }
  }, [trackStates, updateVideoTrackState, updateAudioTrackState]);

  // カラータグ設定
  const setColorTag = useCallback((trackId: string | number, type: 'video' | 'audio', color?: string) => {
    if (type === 'video') {
      updateVideoTrackState(trackId as number, { colorTag: color });
    } else {
      updateAudioTrackState(trackId as string, { colorTag: color });
    }
  }, [updateVideoTrackState, updateAudioTrackState]);

  // 全トラック操作
  const toggleAllCollapse = useCallback(() => {
    const allCollapsed = 
      Object.values(trackStates.videoTracks).every(s => s.collapsed) &&
      Object.values(trackStates.audioTracks).every(s => s.collapsed);

    const newCollapsed = !allCollapsed;

    // すべてのビデオトラックを更新
    Object.keys(trackStates.videoTracks).forEach(layer => {
      updateVideoTrackState(Number(layer), { collapsed: newCollapsed });
    });

    // すべてのオーディオトラックを更新
    Object.keys(trackStates.audioTracks).forEach(trackId => {
      updateAudioTrackState(trackId, { collapsed: newCollapsed });
    });
  }, [trackStates, updateVideoTrackState, updateAudioTrackState]);

  // 全ソロ解除
  const clearAllSolo = useCallback(() => {
    Object.keys(trackStates.videoTracks).forEach(layer => {
      updateVideoTrackState(Number(layer), { solo: false });
    });

    Object.keys(trackStates.audioTracks).forEach(trackId => {
      updateAudioTrackState(trackId, { solo: false });
    });
  }, [trackStates, updateVideoTrackState, updateAudioTrackState]);

  // 表示モード切り替え
  const setViewMode = useCallback((mode: 'normal' | 'dense' | 'focus') => {
    setTrackStates(prev => ({ ...prev, viewMode: mode }));

    // モードに応じてトラック高さを調整
    const heights = {
      dense: minTrackHeight,
      normal: defaultTrackHeight,
      focus: maxTrackHeight
    };

    const newHeight = heights[mode];

    // すべてのトラック高さを更新
    Object.keys(trackStates.videoTracks).forEach(layer => {
      updateVideoTrackState(Number(layer), { height: newHeight });
    });

    Object.keys(trackStates.audioTracks).forEach(trackId => {
      updateAudioTrackState(trackId, { height: newHeight });
    });
  }, [minTrackHeight, defaultTrackHeight, maxTrackHeight, trackStates, updateVideoTrackState, updateAudioTrackState]);

  // 新しいオーディオトラック追加時の状態初期化
  const initializeAudioTrack = useCallback((trackId: string, order?: number) => {
    setTrackStates(prev => ({
      ...prev,
      audioTracks: {
        ...prev.audioTracks,
        [trackId]: {
          height: defaultTrackHeight,
          collapsed: false,
          muted: false,
          solo: false,
          order: order ?? Object.keys(prev.audioTracks).length
        }
      }
    }));
  }, [defaultTrackHeight]);

  // オーディオトラック削除時のクリーンアップ
  const cleanupAudioTrack = useCallback((trackId: string) => {
    setTrackStates(prev => {
      const { [trackId]: removed, ...remainingAudioTracks } = prev.audioTracks;
      return {
        ...prev,
        audioTracks: remainingAudioTracks
      };
    });
  }, []);

  return {
    // 状態
    trackStates,
    soloCount,
    
    // ゲッター
    getVideoTrackState: (layer: number) => trackStates.videoTracks[layer],
    getAudioTrackState: (trackId: string) => trackStates.audioTracks[trackId],
    getEffectiveMuteState,
    
    // 基本操作
    setTrackHeight,
    toggleCollapse,
    toggleMute,
    toggleSolo,
    setColorTag,
    
    // 一括操作
    toggleAllCollapse,
    clearAllSolo,
    setViewMode,
    
    // ライフサイクル
    initializeAudioTrack,
    cleanupAudioTrack,
    
    // プリセット
    presets: {
      dense: () => setViewMode('dense'),
      normal: () => setViewMode('normal'),
      focus: () => setViewMode('focus')
    }
  };
};

export default useTrackManager;
