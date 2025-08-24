import { useRef, useCallback, useEffect, useState } from 'react';

export interface FocusableElement {
  id: string;
  element: HTMLElement;
  type: 'clip' | 'track' | 'control' | 'playhead' | 'marker';
  layer?: number;
  startTime?: number;
  metadata?: Record<string, any>;
}

export interface AccessibilityConfig {
  /** キーボードナビゲーションを有効にするか */
  enableKeyboardNavigation?: boolean;
  /** スクリーンリーダー用の詳細説明を提供するか */
  enableScreenReaderSupport?: boolean;
  /** フォーカス時の視覚的ハイライトを有効にするか */
  enableFocusHighlight?: boolean;
  /** フォーカス音を有効にするか */
  enableFocusSounds?: boolean;
  /** デバッグモード */
  debug?: boolean;
}

export interface AccessibilityState {
  /** 現在フォーカス中の要素 */
  focusedElement: FocusableElement | null;
  /** フォーカス可能な要素のリスト */
  focusableElements: FocusableElement[];
  /** フォーカスモード（linear: 線形, spatial: 空間的） */
  focusMode: 'linear' | 'spatial';
  /** 現在のナビゲーションコンテキスト */
  navigationContext: 'timeline' | 'tracks' | 'controls';
}

/**
 * タイムラインアクセシビリティ機能のフック
 * キーボードナビゲーション、スクリーンリーダー対応、ARIA属性管理
 */
export const useTimelineAccessibility = (config: AccessibilityConfig = {}) => {
  const {
    enableKeyboardNavigation = true,
    enableScreenReaderSupport = true,
    enableFocusHighlight = true,
    enableFocusSounds = false,
    debug = false
  } = config;

  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    focusedElement: null,
    focusableElements: [],
    focusMode: 'linear',
    navigationContext: 'timeline'
  });

  const focusableElementsRef = useRef<Map<string, FocusableElement>>(new Map());
  const announcementRegionRef = useRef<HTMLDivElement | null>(null);

  // ARIA live region for screen reader announcements
  const createAnnouncementRegion = useCallback(() => {
    if (!enableScreenReaderSupport) return;

    if (!announcementRegionRef.current) {
      const region = document.createElement('div');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(region);
      announcementRegionRef.current = region;
    }
  }, [enableScreenReaderSupport]);

  // スクリーンリーダー用アナウンス
  const announceToScreenReader = useCallback((message: string) => {
    if (!enableScreenReaderSupport || !announcementRegionRef.current) return;

    // Clear previous message and set new one
    announcementRegionRef.current.textContent = '';
    setTimeout(() => {
      if (announcementRegionRef.current) {
        announcementRegionRef.current.textContent = message;
      }
    }, 100);

    if (debug) {
      console.log('📢 Screen reader announcement:', message);
    }
  }, [enableScreenReaderSupport, debug]);

  // フォーカス可能な要素を登録
  const registerFocusableElement = useCallback((element: FocusableElement) => {
    focusableElementsRef.current.set(element.id, element);
    
    // ARIA属性を設定
    if (enableScreenReaderSupport) {
      const { element: htmlElement, type, startTime, layer } = element;
      
      // 基本ARIA属性
      htmlElement.setAttribute('role', getRoleForType(type));
      htmlElement.setAttribute('tabindex', '0');
      htmlElement.setAttribute('aria-label', generateAriaLabel(element));
      
      // タイプ固有の属性
      if (type === 'clip') {
        htmlElement.setAttribute('aria-describedby', `clip-description-${element.id}`);
        if (startTime !== undefined) {
          htmlElement.setAttribute('aria-valuetext', `Start time: ${formatTime(startTime)}`);
        }
        if (layer !== undefined) {
          htmlElement.setAttribute('aria-setsize', 'unknown'); // トラック内のクリップ総数
          htmlElement.setAttribute('aria-posinset', `${layer + 1}`); // レイヤー位置
        }
      } else if (type === 'track') {
        htmlElement.setAttribute('aria-expanded', 'true'); // 折りたたみ状態
        htmlElement.setAttribute('aria-controls', `track-content-${element.id}`);
      }
    }

    // フォーカスハイライトの設定
    if (enableFocusHighlight) {
      const originalOutline = element.element.style.outline;
      
      element.element.addEventListener('focus', () => {
        element.element.style.outline = '2px solid #3b82f6';
        element.element.style.outlineOffset = '2px';
      });
      
      element.element.addEventListener('blur', () => {
        element.element.style.outline = originalOutline;
      });
    }

    setAccessibilityState(prev => ({
      ...prev,
      focusableElements: Array.from(focusableElementsRef.current.values())
    }));

    if (debug) {
      console.log('🎯 Registered focusable element:', element.id, element.type);
    }
  }, [enableScreenReaderSupport, enableFocusHighlight, debug]);

  // フォーカス可能な要素を登録解除
  const unregisterFocusableElement = useCallback((elementId: string) => {
    focusableElementsRef.current.delete(elementId);
    
    setAccessibilityState(prev => ({
      ...prev,
      focusableElements: Array.from(focusableElementsRef.current.values()),
      focusedElement: prev.focusedElement?.id === elementId ? null : prev.focusedElement
    }));

    if (debug) {
      console.log('🎯 Unregistered focusable element:', elementId);
    }
  }, [debug]);

  // 要素にフォーカスを設定
  const focusElement = useCallback((elementId: string) => {
    const element = focusableElementsRef.current.get(elementId);
    if (!element) return false;

    element.element.focus();
    
    setAccessibilityState(prev => ({
      ...prev,
      focusedElement: element
    }));

    // スクリーンリーダー用アナウンス
    const announcement = generateFocusAnnouncement(element);
    announceToScreenReader(announcement);

    // フォーカス音（オプション）
    if (enableFocusSounds) {
      playFocusSound(element.type);
    }

    if (debug) {
      console.log('🎯 Focused element:', elementId, element.type);
    }

    return true;
  }, [announceToScreenReader, enableFocusSounds, debug]);

  // 次の要素にフォーカス
  const focusNext = useCallback(() => {
    const elements = accessibilityState.focusableElements;
    if (elements.length === 0) return false;

    const currentIndex = accessibilityState.focusedElement 
      ? elements.findIndex(el => el.id === accessibilityState.focusedElement!.id)
      : -1;

    const nextIndex = (currentIndex + 1) % elements.length;
    return focusElement(elements[nextIndex].id);
  }, [accessibilityState.focusableElements, accessibilityState.focusedElement, focusElement]);

  // 前の要素にフォーカス
  const focusPrevious = useCallback(() => {
    const elements = accessibilityState.focusableElements;
    if (elements.length === 0) return false;

    const currentIndex = accessibilityState.focusedElement 
      ? elements.findIndex(el => el.id === accessibilityState.focusedElement!.id)
      : 0;

    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
    return focusElement(elements[prevIndex].id);
  }, [accessibilityState.focusableElements, accessibilityState.focusedElement, focusElement]);

  // 空間的ナビゲーション（上下左右）
  const focusDirection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const currentElement = accessibilityState.focusedElement;
    if (!currentElement) return false;

    const elements = accessibilityState.focusableElements;
    let targetElement: FocusableElement | null = null;

    if (direction === 'up' || direction === 'down') {
      // 同じ時間位置で異なるレイヤー
      const layerDelta = direction === 'up' ? -1 : 1;
      targetElement = elements.find(el => 
        el.type === currentElement.type &&
        el.startTime === currentElement.startTime &&
        el.layer === (currentElement.layer || 0) + layerDelta
      ) || null;
    } else {
      // 同じレイヤーで時間的に前後
      const timeComparator = direction === 'left' 
        ? (a: number, b: number) => a < b
        : (a: number, b: number) => a > b;
      
      targetElement = elements
        .filter(el => 
          el.type === currentElement.type &&
          el.layer === currentElement.layer &&
          el.startTime !== undefined &&
          currentElement.startTime !== undefined &&
          timeComparator(el.startTime, currentElement.startTime)
        )
        .sort((a, b) => direction === 'left' 
          ? (b.startTime || 0) - (a.startTime || 0)
          : (a.startTime || 0) - (b.startTime || 0)
        )[0] || null;
    }

    return targetElement ? focusElement(targetElement.id) : false;
  }, [accessibilityState.focusedElement, accessibilityState.focusableElements, focusElement]);

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    // フォーカスがinput等にある場合はスキップ
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )) {
      return;
    }

    let handled = false;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        handled = e.shiftKey ? focusPrevious() : focusNext();
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        handled = focusDirection('up');
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        handled = focusDirection('down');
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        handled = focusDirection('left');
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        handled = focusDirection('right');
        break;
      
      case 'Home':
        e.preventDefault();
        if (accessibilityState.focusableElements.length > 0) {
          handled = focusElement(accessibilityState.focusableElements[0].id);
        }
        break;
      
      case 'End':
        e.preventDefault();
        const lastElement = accessibilityState.focusableElements[accessibilityState.focusableElements.length - 1];
        if (lastElement) {
          handled = focusElement(lastElement.id);
        }
        break;
      
      case 'F1':
        e.preventDefault();
        announceToScreenReader(generateHelpText());
        handled = true;
        break;
    }

    if (handled && debug) {
      console.log('⌨️ Keyboard navigation:', e.key);
    }
  }, [enableKeyboardNavigation, focusNext, focusPrevious, focusDirection, accessibilityState.focusableElements, focusElement, announceToScreenReader, debug]);

  // ヘルパー関数
  const getRoleForType = (type: FocusableElement['type']): string => {
    switch (type) {
      case 'clip': return 'option';
      case 'track': return 'group';
      case 'control': return 'button';
      case 'playhead': return 'slider';
      case 'marker': return 'landmark';
      default: return 'generic';
    }
  };

  const generateAriaLabel = (element: FocusableElement): string => {
    const { type, startTime, layer, metadata } = element;
    
    switch (type) {
      case 'clip':
        return `Clip on layer ${(layer || 0) + 1}, starts at ${formatTime(startTime || 0)}, duration ${formatTime(metadata?.duration || 0)}`;
      case 'track':
        return `Track ${(layer || 0) + 1}, contains ${metadata?.clipCount || 0} clips`;
      case 'control':
        return metadata?.name || 'Control';
      case 'playhead':
        return `Playhead at ${formatTime(startTime || 0)}`;
      case 'marker':
        return `Marker at ${formatTime(startTime || 0)}`;
      default:
        return 'Timeline element';
    }
  };

  const generateFocusAnnouncement = (element: FocusableElement): string => {
    return `Focused: ${generateAriaLabel(element)}`;
  };

  const generateHelpText = (): string => {
    return `Timeline keyboard navigation: 
    Tab/Shift+Tab to move between elements,
    Arrow keys for spatial navigation,
    Home/End to jump to first/last element,
    Space or Enter to activate,
    F1 for this help.`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} minutes ${secs} seconds`;
  };

  const playFocusSound = (type: FocusableElement['type']) => {
    // Web Audio API を使用した簡単なフォーカス音
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        clip: 440,
        track: 330,
        control: 523,
        playhead: 660,
        marker: 880
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type] || 440, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      if (debug) console.log('🔇 Focus sound failed:', error);
    }
  };

  // 初期化
  useEffect(() => {
    createAnnouncementRegion();
    
    if (enableKeyboardNavigation) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (announcementRegionRef.current) {
        document.body.removeChild(announcementRegionRef.current);
      }
    };
  }, [createAnnouncementRegion, enableKeyboardNavigation, handleKeyDown]);

  return {
    // 状態
    ...accessibilityState,
    
    // 要素管理
    registerFocusableElement,
    unregisterFocusableElement,
    
    // フォーカス制御
    focusElement,
    focusNext,
    focusPrevious,
    focusDirection,
    
    // アナウンス
    announceToScreenReader,
    
    // ユーティリティ
    generateAriaLabel,
    formatTime,
    
    // デバッグ情報
    debug: debug ? {
      focusableElementsCount: focusableElementsRef.current.size,
      currentFocus: accessibilityState.focusedElement?.id,
      navigationEnabled: enableKeyboardNavigation
    } : undefined
  };
};

export default useTimelineAccessibility;
