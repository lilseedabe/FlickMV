import { useState, useCallback, useEffect } from 'react';
import type { BeatGrid } from '@/types';

export interface SnapControlConfig {
  /** 初期のスナップ設定 */
  initialBeatGrid: BeatGrid;
  /** 設定変更時のコールバック */
  onBeatGridChange: (beatGrid: BeatGrid) => void;
  /** ショートカットキーを有効にするかどうか */
  enableShortcuts?: boolean;
}

export interface SnapControlState {
  /** 現在のビートグリッド設定 */
  beatGrid: BeatGrid;
  /** Magneticモード（一時的なスナップ無効化） */
  magneticMode: boolean;
  /** 実際のスナップ有効状態（beatGrid.enabled && !magneticMode） */
  isSnapEnabled: boolean;
}

/**
 * スナップのオン/オフとモード切替のフック
 * キーボードショートカット（Mキー）でMagneticモードを切り替え
 */
export const useSnapControl = (config: SnapControlConfig) => {
  const {
    initialBeatGrid,
    onBeatGridChange,
    enableShortcuts = true
  } = config;

  const [beatGrid, setBeatGrid] = useState<BeatGrid>(initialBeatGrid);
  const [magneticMode, setMagneticMode] = useState<boolean>(false);

  // 実際のスナップ有効状態
  const isSnapEnabled = beatGrid.enabled && !magneticMode;

  // ビートグリッド設定の更新
  const updateBeatGrid = useCallback((updates: Partial<BeatGrid>) => {
    const newBeatGrid = { ...beatGrid, ...updates };
    setBeatGrid(newBeatGrid);
    onBeatGridChange(newBeatGrid);
  }, [beatGrid, onBeatGridChange]);

  // スナップのオン/オフ切り替え
  const toggleSnap = useCallback(() => {
    updateBeatGrid({ enabled: !beatGrid.enabled });
  }, [beatGrid.enabled, updateBeatGrid]);

  // Magneticモード切り替え（一時的なスナップ無効化）
  const toggleMagneticMode = useCallback(() => {
    setMagneticMode(prev => !prev);
  }, []);

  // クオンタイズ強度の設定
  const setQuantizeStrength = useCallback((strength: number) => {
    updateBeatGrid({ quantizeStrength: Math.max(0, Math.min(1, strength)) });
  }, [updateBeatGrid]);

  // プリセット設定
  const applyPreset = useCallback((preset: 'strict' | 'medium' | 'loose' | 'off') => {
    switch (preset) {
      case 'strict':
        updateBeatGrid({
          enabled: true,
          snapToBeat: true,
          snapToBar: true,
          subdivisions: 4,
          quantizeStrength: 1.0
        });
        break;
      case 'medium':
        updateBeatGrid({
          enabled: true,
          snapToBeat: true,
          snapToBar: false,
          subdivisions: 2,
          quantizeStrength: 0.7
        });
        break;
      case 'loose':
        updateBeatGrid({
          enabled: true,
          snapToBeat: false,
          snapToBar: true,
          subdivisions: 1,
          quantizeStrength: 0.3
        });
        break;
      case 'off':
        updateBeatGrid({ enabled: false });
        break;
    }
  }, [updateBeatGrid]);

  // キーボードショートカットの処理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableShortcuts) return;

    // フォーカスがinput/textarea等にある場合はスキップ
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'm':
        e.preventDefault();
        toggleMagneticMode();
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+S は保存なのでスキップ
          return;
        }
        e.preventDefault();
        toggleSnap();
        break;
      case '1':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyPreset('strict');
        }
        break;
      case '2':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyPreset('medium');
        }
        break;
      case '3':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyPreset('loose');
        }
        break;
      case '0':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyPreset('off');
        }
        break;
    }
  }, [enableShortcuts, toggleMagneticMode, toggleSnap, applyPreset]);

  // イベントリスナーの登録
  useEffect(() => {
    if (enableShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enableShortcuts, handleKeyDown]);

  return {
    // 状態
    beatGrid,
    magneticMode,
    isSnapEnabled,
    
    // アクション
    updateBeatGrid,
    toggleSnap,
    toggleMagneticMode,
    setQuantizeStrength,
    applyPreset,
    
    // プリセット用のヘルパー
    presets: {
      strict: () => applyPreset('strict'),
      medium: () => applyPreset('medium'),
      loose: () => applyPreset('loose'),
      off: () => applyPreset('off')
    },
    
    // 現在の設定の説明
    statusText: magneticMode 
      ? 'Magnetic Mode (スナップ一時無効)'
      : isSnapEnabled 
        ? `スナップ有効 (強度: ${Math.round(beatGrid.quantizeStrength * 100)}%)`
        : 'スナップ無効'
  };
};

export default useSnapControl;
