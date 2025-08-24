import { useState, useEffect } from 'react';

// ブレークポイント定義（Tailwind と一致）
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// 画面サイズフック
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// ブレークポイント検知フック
export const useBreakpoint = (breakpoint?: Breakpoint) => {
  const { width } = useScreenSize();

  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  const isLargeScreen = width >= breakpoints.xl;

  // 特定ブレークポイント以上かチェック
  const isAbove = (bp: Breakpoint) => width >= breakpoints[bp];
  const isBelow = (bp: Breakpoint) => width < breakpoints[bp];

  // 現在のブレークポイントを取得
  const getCurrentBreakpoint = (): Breakpoint => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    return 'sm';
  };

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isAbove,
    isBelow,
    current: getCurrentBreakpoint(),
    ...(breakpoint && { [breakpoint]: isAbove(breakpoint) }),
  } as const;
};

// モバイル検知フック
export const useIsMobile = () => {
  const { isMobile } = useBreakpoint();
  return isMobile;
};

// タッチデバイス検知フック
export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    setIsTouchDevice(checkTouchDevice());
  }, []);

  return isTouchDevice;
};

// 向き検知フック
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      const scr: any = (typeof screen !== 'undefined' ? screen : null);
      if (scr && scr.orientation) {
        setOrientation(scr.orientation.angle === 0 || scr.orientation.angle === 180 ? 'portrait' : 'landscape');
      } else {
        // フォールバック
        setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      }
    };

    handleOrientationChange();

    const scr: any = (typeof screen !== 'undefined' ? screen : null);
    if (scr && scr.orientation) {
      scr.orientation.addEventListener('change', handleOrientationChange);
      return () => scr.orientation.removeEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('resize', handleOrientationChange);
      return () => window.removeEventListener('resize', handleOrientationChange);
    }
  }, []);

  return orientation;
};

// オンライン状態フック
export const useIsOnline = () => {
  const hasNavigator = typeof navigator !== 'undefined';
  const [isOnline, setIsOnline] = useState(hasNavigator ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// プリファーカラースキーム検知フック
export const usePrefersDarkMode = () => {
  const initial = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  const [prefersDark, setPrefersDark] = useState(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
};

// 動きの削減設定検知フック
export const usePrefersReducedMotion = () => {
  const initial =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// バッテリー情報フック（実験的）
export const useBatteryInfo = () => {
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  } | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const navAny = navigator as any;
    if (!navAny.getBattery) return;

    let batteryObj: any | null = null;

    navAny.getBattery().then((battery: any) => {
      batteryObj = battery;

      const updateBatteryInfo = () => {
        setBatteryInfo({
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        });
      };

      updateBatteryInfo();

      battery.addEventListener('chargingchange', updateBatteryInfo);
      battery.addEventListener('levelchange', updateBatteryInfo);
    });

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('chargingchange', () => {});
        batteryObj.removeEventListener('levelchange', () => {});
      }
    };
  }, []);

  return batteryInfo;
};

// デバイス情報フック
export const useDeviceInfo = () => {
  const { width, height } = useScreenSize();
  const { current: breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();
  const isTouchDevice = useIsTouchDevice();
  const orientation = useOrientation();
  const isOnline = useIsOnline();
  const prefersDarkMode = usePrefersDarkMode();
  const prefersReducedMotion = usePrefersReducedMotion();
  const batteryInfo = useBatteryInfo();

  return {
    screen: { width, height },
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    orientation,
    isOnline,
    prefersDarkMode,
    prefersReducedMotion,
    batteryInfo,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    platform: typeof navigator !== 'undefined' ? navigator.platform : '',
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
  } as const;
};

// アダプティブローディング（低電力モードやネットワーク状態に応じた最適化）
export const useAdaptiveLoading = () => {
  const isOnline = useIsOnline();
  const batteryInfo = useBatteryInfo();
  const { isMobile } = useBreakpoint();

  // 低電力モードかどうかを判定
  const isLowPowerMode = !!batteryInfo && batteryInfo.level < 0.2 && !batteryInfo.charging;

  // データセーバーモード（実験的）
  const isDataSaverMode =
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    (navigator as any).connection?.saveData === true;

  // 最適化レベルを決定
  const getOptimizationLevel = (): 'high' | 'medium' | 'low' => {
    if (!isOnline || isLowPowerMode || isDataSaverMode) {
      return 'high'; // 高度な最適化
    }
    if (isMobile) {
      return 'medium'; // 中程度の最適化
    }
    return 'low'; // 最小限の最適化
  };

  return {
    isOnline,
    isLowPowerMode,
    isDataSaverMode,
    optimizationLevel: getOptimizationLevel(),
    shouldReduceAnimations: isLowPowerMode || isDataSaverMode,
    shouldReduceImageQuality: isDataSaverMode || isLowPowerMode,
    shouldLazyLoad: isMobile || isDataSaverMode,
  } as const;
};

export default {
  useScreenSize,
  useBreakpoint,
  useIsMobile,
  useIsTouchDevice,
  useOrientation,
  useIsOnline,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  useBatteryInfo,
  useDeviceInfo,
  useAdaptiveLoading,
};
