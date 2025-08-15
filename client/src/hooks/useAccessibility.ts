import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { usePrefersReducedMotion } from './useResponsive';

// フォーカス管理フック
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // フォーカスをトラップする
  const trapFocus = useCallback((containerRef: RefObject<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  // 以前のフォーカスを保存
  const savePreviousFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  // 以前のフォーカスを復元
  const restorePreviousFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  // フォーカス可能要素を検索
  const findFocusableElements = useCallback((container: HTMLElement) => {
    return container.querySelectorAll(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
  }, []);

  // Escキーでフォーカスをクリア
  const clearFocusOnEscape = useCallback((callback?: () => void) => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        callback?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return {
    focusedElement,
    setFocusedElement,
    trapFocus,
    savePreviousFocus,
    restorePreviousFocus,
    findFocusableElements,
    clearFocusOnEscape,
  };
};

// スクリーンリーダー対応フック
export const useScreenReader = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // スクリーンリーダーに通知
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = { message, priority, id: Date.now().toString() };
    setAnnouncements(prev => [...prev, message]);

    // 一定時間後に削除
    setTimeout(() => {
      setAnnouncements(prev => prev.filter((_, index) => index !== 0));
    }, 3000);
  }, []);

  return {
    announce,
    announcements,
  };
};

// キーボードナビゲーションフック
export const useKeyboardNavigation = (
  items: HTMLElement[] | (() => HTMLElement[]),
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (item: HTMLElement, index: number) => void;
  } = {}
) => {
  const { loop = true, orientation = 'vertical', onSelect } = options;
  const [currentIndex, setCurrentIndex] = useState(-1);

  const getItems = useCallback(() => {
    return typeof items === 'function' ? items() : items;
  }, [items]);

  const navigate = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    const itemList = getItems();
    if (itemList.length === 0) return;

    let newIndex = currentIndex;

    switch (direction) {
      case 'next':
        newIndex = currentIndex + 1;
        if (newIndex >= itemList.length) {
          newIndex = loop ? 0 : itemList.length - 1;
        }
        break;
      case 'previous':
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? itemList.length - 1 : 0;
        }
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = itemList.length - 1;
        break;
    }

    setCurrentIndex(newIndex);
    itemList[newIndex]?.focus();
  }, [currentIndex, getItems, loop]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { key } = e;
    
    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          navigate('next');
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          navigate('previous');
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          navigate('next');
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          navigate('previous');
        }
        break;
      case 'Home':
        e.preventDefault();
        navigate('first');
        break;
      case 'End':
        e.preventDefault();
        navigate('last');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        const itemList = getItems();
        if (currentIndex >= 0 && currentIndex < itemList.length) {
          onSelect?.(itemList[currentIndex], currentIndex);
        }
        break;
    }
  }, [navigate, currentIndex, getItems, onSelect, orientation]);

  return {
    currentIndex,
    setCurrentIndex,
    navigate,
    handleKeyDown,
  };
};

// ARIAラベル生成フック
export const useAriaLabels = () => {
  const generateId = useCallback((prefix: string = 'element') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getAriaProps = useCallback((
    element: {
      label?: string;
      description?: string;
      required?: boolean;
      invalid?: boolean;
      expanded?: boolean;
      selected?: boolean;
      disabled?: boolean;
      level?: number;
      position?: { current: number; total: number };
    }
  ) => {
    const props: Record<string, any> = {};

    if (element.label) {
      props['aria-label'] = element.label;
    }

    if (element.description) {
      const descId = generateId('desc');
      props['aria-describedby'] = descId;
    }

    if (element.required) {
      props['aria-required'] = true;
    }

    if (element.invalid) {
      props['aria-invalid'] = true;
    }

    if (element.expanded !== undefined) {
      props['aria-expanded'] = element.expanded;
    }

    if (element.selected !== undefined) {
      props['aria-selected'] = element.selected;
    }

    if (element.disabled) {
      props['aria-disabled'] = true;
    }

    if (element.level) {
      props['aria-level'] = element.level;
    }

    if (element.position) {
      props['aria-posinset'] = element.position.current;
      props['aria-setsize'] = element.position.total;
    }

    return props;
  }, [generateId]);

  return {
    generateId,
    getAriaProps,
  };
};

// カラーコントラスト検証フック
export const useColorContrast = () => {
  const checkContrast = useCallback((foreground: string, background: string) => {
    // RGB値に変換
    const getRGB = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return [0, 0, 0];
      
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };

    // 相対輝度を計算
    const getLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    // コントラスト比を計算
    const getContrastRatio = (lum1: number, lum2: number) => {
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    };

    try {
      const fgRGB = getRGB(foreground);
      const bgRGB = getRGB(background);
      const fgLum = getLuminance(fgRGB);
      const bgLum = getLuminance(bgRGB);
      const ratio = getContrastRatio(fgLum, bgLum);

      return {
        ratio,
        passAA: ratio >= 4.5,     // WCAG AA基準
        passAAA: ratio >= 7,      // WCAG AAA基準
        passAALarge: ratio >= 3,  // 大きなテキスト用AA基準
      };
    } catch {
      return {
        ratio: 0,
        passAA: false,
        passAAA: false,
        passAALarge: false,
      };
    }
  }, []);

  return { checkContrast };
};

// モーション設定フック
export const useMotionSettings = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const getMotionConfig = useCallback(() => {
    if (prefersReducedMotion) {
      return {
        transition: { duration: 0 },
        animate: {},
        initial: {},
      };
    }

    return {
      transition: { duration: 0.3, ease: 'easeInOut' },
      animate: { opacity: 1, scale: 1 },
      initial: { opacity: 0, scale: 0.95 },
    };
  }, [prefersReducedMotion]);

  return {
    prefersReducedMotion,
    getMotionConfig,
    shouldAnimate: !prefersReducedMotion,
  };
};

// ライブリージョン管理フック
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const updateLiveRegion = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
      
      // メッセージをクリア
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const LiveRegion = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  ), []);

  return {
    updateLiveRegion,
    LiveRegion,
  };
};

// アクセシビリティ総合フック
export const useAccessibility = () => {
  const focus = useFocusManagement();
  const screenReader = useScreenReader();
  const aria = useAriaLabels();
  const colorContrast = useColorContrast();
  const motion = useMotionSettings();
  const liveRegion = useLiveRegion();

  return {
    focus,
    screenReader,
    aria,
    colorContrast,
    motion,
    liveRegion,
  };
};

export default {
  useFocusManagement,
  useScreenReader,
  useKeyboardNavigation,
  useAriaLabels,
  useColorContrast,
  useMotionSettings,
  useLiveRegion,
  useAccessibility,
};
