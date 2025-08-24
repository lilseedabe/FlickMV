import { useState, useCallback, useRef, useMemo } from 'react';
import type { Timeline, TimelineClip, Effect } from '@/types';

export interface AuditionVersion {
  /** バージョンID */
  id: string;
  /** バージョン名 */
  name: string;
  /** タイムライン状態 */
  timeline: Timeline;
  /** 作成日時 */
  createdAt: number;
  /** 最終更新日時 */
  updatedAt: number;
  /** 説明 */
  description?: string;
  /** 色タグ */
  color?: string;
  /** スター評価 */
  rating?: number;
  /** メタデータ */
  metadata?: Record<string, any>;
}

export interface AuditionComparison {
  /** 比較対象のバージョンA */
  versionA: AuditionVersion;
  /** 比較対象のバージョンB */
  versionB: AuditionVersion;
  /** 比較開始時刻 */
  startTime: number;
  /** 比較終了時刻 */
  endTime: number;
  /** 比較モード */
  mode: 'split' | 'overlay' | 'sequence';
}

export interface AuditionConfig {
  /** 最大バージョン保持数 */
  maxVersions?: number;
  /** 自動保存間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** 自動保存を有効にするか */
  enableAutoSave?: boolean;
  /** デバッグモード */
  debug?: boolean;
}

export interface AuditionState {
  /** 現在アクティブなバージョン */
  activeVersion: AuditionVersion | null;
  /** 保存されたバージョン一覧 */
  versions: AuditionVersion[];
  /** 比較の状態 */
  comparison: AuditionComparison | null;
  /** オーディションモードが有効か */
  isAuditionMode: boolean;
  /** プレビュー中のバージョン */
  previewVersion: AuditionVersion | null;
}

/**
 * オーディション（A/B比較）機能のフック
 * 複数のタイムライン状態を保存・比較・切り替えが可能
 */
export const useAudition = (
  initialTimeline: Timeline,
  config: AuditionConfig = {}
) => {
  const {
    maxVersions = 10,
    autoSaveInterval = 30000, // 30秒
    enableAutoSave = true,
    debug = false
  } = config;

  const [auditionState, setAuditionState] = useState<AuditionState>(() => {
    const initialVersion: AuditionVersion = {
      id: 'initial',
      name: 'Original',
      timeline: initialTimeline,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description: 'Initial timeline state',
      color: '#3b82f6'
    };

    return {
      activeVersion: initialVersion,
      versions: [initialVersion],
      comparison: null,
      isAuditionMode: false,
      previewVersion: null
    };
  });

  const autoSaveTimeoutRef = useRef<number | null>(null);
  const lastSavedStateRef = useRef<string>(JSON.stringify(initialTimeline));

  // ランダム色生成
  const getRandomColor = (): string => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // バージョン作成
  const createVersion = useCallback((
    timeline: Timeline,
    name: string,
    description?: string,
    color?: string
  ): AuditionVersion => {
    const version: AuditionVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      timeline: JSON.parse(JSON.stringify(timeline)), // Deep clone
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description,
      color: color || getRandomColor()
    };

    setAuditionState(prev => {
      let newVersions = [...prev.versions, version];
      
      // 最大数を超えた場合、古いものから削除（initialは除く）
      if (newVersions.length > maxVersions) {
        newVersions = [
          newVersions[0], // initial version
          ...newVersions.slice(-(maxVersions - 1))
        ];
      }

      return {
        ...prev,
        versions: newVersions,
        activeVersion: version
      };
    });

    if (debug) {
      console.log('📝 Created new audition version:', name, version.id);
    }

    return version;
  }, [maxVersions, debug]);

  // 現在の状態からバージョンを保存
  const saveCurrentAsVersion = useCallback((
    timeline: Timeline,
    name?: string,
    description?: string
  ) => {
    const versionName = name || `Version ${auditionState.versions.length}`;
    return createVersion(timeline, versionName, description);
  }, [auditionState.versions.length, createVersion]);

  // バージョンの更新
  const updateVersion = useCallback((
    versionId: string,
    updates: Partial<Pick<AuditionVersion, 'name' | 'description' | 'color' | 'rating' | 'metadata'>>
  ) => {
    setAuditionState(prev => ({
      ...prev,
      versions: prev.versions.map(version =>
        version.id === versionId
          ? { ...version, ...updates, updatedAt: Date.now() }
          : version
      ),
      activeVersion: prev.activeVersion?.id === versionId
        ? { ...prev.activeVersion, ...updates, updatedAt: Date.now() }
        : prev.activeVersion
    }));

    if (debug) {
      console.log('✏️ Updated audition version:', versionId, updates);
    }
  }, [debug]);

  // バージョンの削除
  const deleteVersion = useCallback((versionId: string) => {
    if (versionId === 'initial') {
      console.warn('Cannot delete initial version');
      return false;
    }

    setAuditionState(prev => {
      const newVersions = prev.versions.filter(v => v.id !== versionId);
      const newActiveVersion = prev.activeVersion?.id === versionId
        ? newVersions[0] || null
        : prev.activeVersion;

      return {
        ...prev,
        versions: newVersions,
        activeVersion: newActiveVersion,
        comparison: prev.comparison?.versionA.id === versionId || prev.comparison?.versionB.id === versionId
          ? null
          : prev.comparison
      };
    });

    if (debug) {
      console.log('🗑️ Deleted audition version:', versionId);
    }

    return true;
  }, [debug]);

  // バージョンの切り替え
  const switchToVersion = useCallback((versionId: string) => {
    const version = auditionState.versions.find(v => v.id === versionId);
    if (!version) return null;

    setAuditionState(prev => ({
      ...prev,
      activeVersion: version,
      previewVersion: null
    }));

    if (debug) {
      console.log('🔄 Switched to version:', version.name, versionId);
    }

    return version.timeline;
  }, [auditionState.versions, debug]);

  // プレビュー（一時的な切り替え）
  const previewVersion = useCallback((versionId: string | null) => {
    if (versionId === null) {
      setAuditionState(prev => ({ ...prev, previewVersion: null }));
      return auditionState.activeVersion?.timeline || null;
    }

    const version = auditionState.versions.find(v => v.id === versionId);
    if (!version) return null;

    setAuditionState(prev => ({ ...prev, previewVersion: version }));

    if (debug) {
      console.log('👁️ Previewing version:', version.name, versionId);
    }

    return version.timeline;
  }, [auditionState.versions, auditionState.activeVersion, debug]);

  // A/B比較開始
  const startComparison = useCallback((
    versionAId: string,
    versionBId: string,
    startTime: number = 0,
    endTime?: number,
    mode: AuditionComparison['mode'] = 'split'
  ) => {
    const versionA = auditionState.versions.find(v => v.id === versionAId);
    const versionB = auditionState.versions.find(v => v.id === versionBId);

    if (!versionA || !versionB) {
      console.warn('One or both versions not found for comparison');
      return false;
    }

    const comparison: AuditionComparison = {
      versionA,
      versionB,
      startTime,
      endTime: endTime || Math.max(versionA.timeline.duration, versionB.timeline.duration),
      mode
    };

    setAuditionState(prev => ({
      ...prev,
      comparison,
      isAuditionMode: true
    }));

    if (debug) {
      console.log('🔄 Started A/B comparison:', versionA.name, 'vs', versionB.name);
    }

    return true;
  }, [auditionState.versions, debug]);

  // 比較終了
  const endComparison = useCallback(() => {
    setAuditionState(prev => ({
      ...prev,
      comparison: null,
      isAuditionMode: false
    }));

    if (debug) {
      console.log('⏹️ Ended A/B comparison');
    }
  }, [debug]);

  // 比較モードの切り替え
  const switchComparisonMode = useCallback((mode: AuditionComparison['mode']) => {
    setAuditionState(prev => prev.comparison ? {
      ...prev,
      comparison: { ...prev.comparison, mode }
    } : prev);

    if (debug) {
      console.log('🔀 Switched comparison mode:', mode);
    }
  }, [debug]);

  // オーディションモードの切り替え
  const toggleAuditionMode = useCallback(() => {
    setAuditionState(prev => ({
      ...prev,
      isAuditionMode: !prev.isAuditionMode,
      comparison: !prev.isAuditionMode ? prev.comparison : null
    }));

    if (debug) {
      console.log('🎭 Toggled audition mode:', !auditionState.isAuditionMode);
    }
  }, [auditionState.isAuditionMode, debug]);

  // 自動保存
  const triggerAutoSave = useCallback((timeline: Timeline) => {
    if (!enableAutoSave) return;

    const currentStateStr = JSON.stringify(timeline);
    if (currentStateStr === lastSavedStateRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      saveCurrentAsVersion(timeline, `Auto-save ${new Date().toLocaleTimeString()}`);
      lastSavedStateRef.current = currentStateStr;
      
      if (debug) {
        console.log('💾 Auto-saved timeline version');
      }
    }, autoSaveInterval);
  }, [enableAutoSave, autoSaveInterval, saveCurrentAsVersion, debug]);

  // バージョン間の差分計算
  const calculateVersionDiff = useCallback((versionAId: string, versionBId: string) => {
    const versionA = auditionState.versions.find(v => v.id === versionAId);
    const versionB = auditionState.versions.find(v => v.id === versionBId);

    if (!versionA || !versionB) return null;

    const diff = {
      clips: {
        added: versionB.timeline.clips.filter(clipB => 
          !versionA.timeline.clips.find(clipA => clipA.id === clipB.id)
        ),
        removed: versionA.timeline.clips.filter(clipA => 
          !versionB.timeline.clips.find(clipB => clipB.id === clipA.id)
        ),
        modified: versionB.timeline.clips.filter(clipB => {
          const clipA = versionA.timeline.clips.find(c => c.id === clipB.id);
          return clipA && JSON.stringify(clipA) !== JSON.stringify(clipB);
        })
      },
      duration: versionB.timeline.duration - versionA.timeline.duration,
      audioTracks: {
        added: versionB.timeline.audioTracks.filter(trackB => 
          !versionA.timeline.audioTracks.find(trackA => trackA.id === trackB.id)
        ),
        removed: versionA.timeline.audioTracks.filter(trackA => 
          !versionB.timeline.audioTracks.find(trackB => trackB.id === trackA.id)
        )
      }
    };

    return diff;
  }, [auditionState.versions]);

  // 現在表示すべきタイムライン
  const currentTimeline = useMemo(() => {
    if (auditionState.previewVersion) {
      return auditionState.previewVersion.timeline;
    }
    return auditionState.activeVersion?.timeline || initialTimeline;
  }, [auditionState.previewVersion, auditionState.activeVersion, initialTimeline]);

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  }, []);

  return {
    // 状態
    ...auditionState,
    currentTimeline,
    
    // バージョン管理
    createVersion,
    saveCurrentAsVersion,
    updateVersion,
    deleteVersion,
    switchToVersion,
    previewVersion,
    
    // A/B比較
    startComparison,
    endComparison,
    switchComparisonMode,
    
    // モード制御
    toggleAuditionMode,
    
    // ユーティリティ
    calculateVersionDiff,
    triggerAutoSave,
    cleanup,
    
    // 統計
    stats: {
      totalVersions: auditionState.versions.length,
      activeVersionName: auditionState.activeVersion?.name,
      isComparing: !!auditionState.comparison,
      comparisonMode: auditionState.comparison?.mode
    }
  };
};

export default useAudition;
