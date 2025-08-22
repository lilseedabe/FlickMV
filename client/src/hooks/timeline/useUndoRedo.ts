import { useState, useCallback, useRef, useEffect } from 'react';

export type ActionType = 
  | 'clip_move'
  | 'clip_resize' 
  | 'clip_split'
  | 'clip_delete'
  | 'clip_add'
  | 'clip_copy'
  | 'transition_add'
  | 'transition_remove'
  | 'track_add'
  | 'track_remove'
  | 'track_mute'
  | 'track_solo'
  | 'timeline_property_change';

export interface UndoAction<T = any> {
  /** アクションの一意ID */
  id: string;
  /** アクションの種類 */
  type: ActionType;
  /** アクションの説明 */
  description: string;
  /** 実行時刻 */
  timestamp: number;
  /** 操作前の状態 */
  beforeState: T;
  /** 操作後の状態 */
  afterState: T;
  /** リドゥ用の追加データ */
  metadata?: Record<string, any>;
}

export interface UndoRedoConfig<T> {
  /** 履歴の最大保持数 */
  maxHistorySize?: number;
  /** 状態の比較関数（差分検出用） */
  stateComparer?: (a: T, b: T) => boolean;
  /** 状態のクローン関数 */
  stateCloner?: (state: T) => T;
  /** デバッグモード */
  debug?: boolean;
}

export interface UndoRedoState {
  /** 元に戻せるかどうか */
  canUndo: boolean;
  /** やり直せるかどうか */
  canRedo: boolean;
  /** 履歴の総数 */
  historySize: number;
  /** 現在の位置 */
  currentIndex: number;
  /** 最後のアクション */
  lastAction?: UndoAction;
}

/**
 * Undo/Redo機能の共通フック
 * タイムライン編集操作の履歴管理と巻き戻し機能を提供
 */
export const useUndoRedo = <T>(
  initialState: T,
  config: UndoRedoConfig<T> = {}
) => {
  const {
    maxHistorySize = 50,
    stateComparer = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    stateCloner = (state) => JSON.parse(JSON.stringify(state)) as T,
    debug = false
  } = config;

  // 現在の状態
  const [currentState, setCurrentState] = useState<T>(initialState);
  
  // 履歴スタック
  const [history, setHistory] = useState<UndoAction<T>[]>([]);
  
  // 現在の履歴位置（-1 = 最新状態）
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  
  // 操作中フラグ（無限ループ防止）
  const isApplyingActionRef = useRef<boolean>(false);
  
  // アクション実行
  const executeAction = useCallback((
    type: ActionType,
    description: string,
    newState: T,
    metadata?: Record<string, any>
  ) => {
    if (isApplyingActionRef.current) {
      if (debug) console.log('🔄 Action skipped: already applying action');
      return;
    }

    // 状態が変更されていない場合はスキップ
    if (stateComparer(currentState, newState)) {
      if (debug) console.log('⏭️ Action skipped: no state change detected');
      return;
    }

    const action: UndoAction<T> = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      timestamp: Date.now(),
      beforeState: stateCloner(currentState),
      afterState: stateCloner(newState),
      metadata
    };

    setHistory(prevHistory => {
      // 現在位置より後の履歴を削除（新しい分岐）
      const newHistory = currentIndex >= 0 
        ? prevHistory.slice(0, currentIndex + 1)
        : [];
      
      // 新しいアクションを追加
      newHistory.push(action);
      
      // 履歴サイズ制限
      if (newHistory.length > maxHistorySize) {
        newHistory.shift(); // 古いものから削除
      }
      
      return newHistory;
    });

    setCurrentIndex(prev => {
      const newIndex = prev >= 0 ? Math.min(prev + 1, maxHistorySize - 1) : 0;
      return newIndex;
    });

    setCurrentState(newState);

    if (debug) {
      console.log(`✅ Action executed: ${description}`, {
        type,
        actionId: action.id,
        historySize: history.length + 1
      });
    }
  }, [currentState, currentIndex, stateComparer, stateCloner, maxHistorySize, debug, history.length]);

  // Undo実行
  const undo = useCallback(() => {
    if (currentIndex < 0 || history.length === 0) {
      if (debug) console.log('❌ Undo failed: no history available');
      return false;
    }

    isApplyingActionRef.current = true;

    const action = history[currentIndex];
    setCurrentState(action.beforeState);
    setCurrentIndex(prev => prev - 1);

    if (debug) {
      console.log(`⬅️ Undo executed: ${action.description}`, {
        actionId: action.id,
        newIndex: currentIndex - 1
      });
    }

    // 非同期でフラグをリセット
    setTimeout(() => {
      isApplyingActionRef.current = false;
    }, 0);

    return true;
  }, [currentIndex, history, debug]);

  // Redo実行
  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) {
      if (debug) console.log('❌ Redo failed: no redo history available');
      return false;
    }

    isApplyingActionRef.current = true;

    const nextIndex = currentIndex + 1;
    const action = history[nextIndex];
    setCurrentState(action.afterState);
    setCurrentIndex(nextIndex);

    if (debug) {
      console.log(`➡️ Redo executed: ${action.description}`, {
        actionId: action.id,
        newIndex: nextIndex
      });
    }

    // 非同期でフラグをリセット
    setTimeout(() => {
      isApplyingActionRef.current = false;
    }, 0);

    return true;
  }, [currentIndex, history, debug]);

  // 履歴クリア
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    
    if (debug) {
      console.log('🧹 History cleared');
    }
  }, [debug]);

  // 特定のアクションタイプの履歴を取得
  const getHistoryByType = useCallback((type: ActionType): UndoAction<T>[] => {
    return history.filter(action => action.type === type);
  }, [history]);

  // 履歴の統計情報
  const getHistoryStats = useCallback(() => {
    const actionCounts: Record<ActionType, number> = {} as Record<ActionType, number>;
    
    history.forEach(action => {
      actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
    });

    const totalActions = history.length;
    const oldestAction = history[0];
    const newestAction = history[history.length - 1];

    return {
      totalActions,
      actionCounts,
      oldestTimestamp: oldestAction?.timestamp,
      newestTimestamp: newestAction?.timestamp,
      currentPosition: currentIndex + 1,
      maxSize: maxHistorySize
    };
  }, [history, currentIndex, maxHistorySize]);

  // 状態
  const undoRedoState: UndoRedoState = {
    canUndo: currentIndex >= 0 && history.length > 0,
    canRedo: currentIndex < history.length - 1,
    historySize: history.length,
    currentIndex,
    lastAction: history[currentIndex]
  };

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
               ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')) {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  // キーボードショートカットの登録
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    // 現在の状態
    state: currentState,
    setState: setCurrentState,
    
    // アクション
    executeAction,
    undo,
    redo,
    clearHistory,
    
    // 状態
    ...undoRedoState,
    
    // ユーティリティ
    getHistoryByType,
    getHistoryStats,
    
    // 生の履歴（デバッグ用）
    history: debug ? history : undefined
  };
};

export default useUndoRedo;
