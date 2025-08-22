import { useCallback, useRef, useState, useEffect } from 'react';

export interface DragConfig {
  /** ドラッグが有効かどうか */
  enabled?: boolean;
  /** スロットリング間隔（requestAnimationFrame使用） */
  throttle?: boolean;
  /** ドラッグ開始時のコールバック */
  onDragStart?: (e: PointerEvent) => void;
  /** ドラッグ中のコールバック */
  onDragMove?: (e: PointerEvent, deltaX: number, deltaY: number) => void;
  /** ドラッグ終了時のコールバック */
  onDragEnd?: (e: PointerEvent) => void;
}

export interface DragState {
  /** ドラッグ中かどうか */
  isDragging: boolean;
  /** ドラッグ開始位置 */
  startPosition: { x: number; y: number } | null;
  /** 現在位置 */
  currentPosition: { x: number; y: number } | null;
  /** ドラッグ移動量 */
  delta: { x: number; y: number };
}

/**
 * Pointer Eventsベースのドラッグ処理フック
 * タッチ・ペン・マウスを統一的に処理し、requestAnimationFrameでスロットリング
 */
export const useTimelineDrag = (config: DragConfig) => {
  const {
    enabled = true,
    throttle = true,
    onDragStart,
    onDragMove,
    onDragEnd
  } = config;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startPosition: null,
    currentPosition: null,
    delta: { x: 0, y: 0 }
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<PointerEvent | null>(null);

  // requestAnimationFrameでスロットリングされたmove処理
  const throttledMove = useCallback(() => {
    if (pendingMoveRef.current && dragState.startPosition) {
      const e = pendingMoveRef.current;
      const deltaX = e.clientX - dragState.startPosition.x;
      const deltaY = e.clientY - dragState.startPosition.y;

      setDragState(prev => ({
        ...prev,
        currentPosition: { x: e.clientX, y: e.clientY },
        delta: { x: deltaX, y: deltaY }
      }));

      onDragMove?.(e, deltaX, deltaY);
      pendingMoveRef.current = null;
    }
    rafRef.current = null;
  }, [dragState.startPosition, onDragMove]);

  // ドラッグ開始
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!enabled) return;

    // setPointerCaptureで確実にイベントをキャプチャ
    if (elementRef.current) {
      elementRef.current.setPointerCapture(e.pointerId);
    }

    const startPos = { x: e.clientX, y: e.clientY };
    
    setDragState({
      isDragging: true,
      startPosition: startPos,
      currentPosition: startPos,
      delta: { x: 0, y: 0 }
    });

    onDragStart?.(e);
  }, [enabled, onDragStart]);

  // ドラッグ中
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging) return;

    if (throttle) {
      // requestAnimationFrameでスロットリング
      pendingMoveRef.current = e;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(throttledMove);
      }
    } else {
      // 即座に処理
      if (dragState.startPosition) {
        const deltaX = e.clientX - dragState.startPosition.x;
        const deltaY = e.clientY - dragState.startPosition.y;

        setDragState(prev => ({
          ...prev,
          currentPosition: { x: e.clientX, y: e.clientY },
          delta: { x: deltaX, y: deltaY }
        }));

        onDragMove?.(e, deltaX, deltaY);
      }
    }
  }, [dragState.isDragging, dragState.startPosition, throttle, throttledMove, onDragMove]);

  // ドラッグ終了
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging) return;

    // ポインタキャプチャを解除
    if (elementRef.current) {
      elementRef.current.releasePointerCapture(e.pointerId);
    }

    // 保留中のrAFをキャンセル
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setDragState({
      isDragging: false,
      startPosition: null,
      currentPosition: null,
      delta: { x: 0, y: 0 }
    });

    pendingMoveRef.current = null;
    onDragEnd?.(e);
  }, [dragState.isDragging, onDragEnd]);

  // キャンセル処理（ポインタが無効化された場合など）
  const handlePointerCancel = useCallback((e: PointerEvent) => {
    if (dragState.isDragging) {
      handlePointerUp(e);
    }
  }, [dragState.isDragging, handlePointerUp]);

  // 要素にイベントリスナーを設定するヘルパー
  const registerElement = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      // 既存の要素からリスナーを削除
      elementRef.current.removeEventListener('pointerdown', handlePointerDown as any);
      elementRef.current.removeEventListener('pointermove', handlePointerMove as any);
      elementRef.current.removeEventListener('pointerup', handlePointerUp as any);
      elementRef.current.removeEventListener('pointercancel', handlePointerCancel as any);
    }

    elementRef.current = element;

    if (element) {
      // 新しい要素にリスナーを追加
      element.addEventListener('pointerdown', handlePointerDown as any);
      element.addEventListener('pointermove', handlePointerMove as any);
      element.addEventListener('pointerup', handlePointerUp as any);
      element.addEventListener('pointercancel', handlePointerCancel as any);
      
      // タッチアクションを無効化してスクロール等を防ぐ
      element.style.touchAction = 'none';
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      registerElement(null);
    };
  }, [registerElement]);

  return {
    dragState,
    registerElement,
    isDragging: dragState.isDragging,
    startPosition: dragState.startPosition,
    currentPosition: dragState.currentPosition,
    delta: dragState.delta
  };
};

export default useTimelineDrag;
