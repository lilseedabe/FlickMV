import { useState, useEffect } from 'react';

// ブレークポイントの定義（Tailwindと一致）
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

// ブレークポイント検出フック
export const useBreakpoint = (breakpoint?: Breakpoint) => {
  const { width } = useScreenSize();
  
  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  const isLargeScreen = width >= breakpoints.xl;

  // 特定のブレークポイント以上かチェック
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
    ...(breakpoint && { [breakpoint]: isAbove(breakpoint) })
  };
};

// モバイル検出フック
export const useIsMobile = () => {
  const { isMobile } = useBreakpoint();
  return isMobile;
};

// タッチデバイス検出フック
export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    setIsTouchDevice(checkTouchDevice());
  }, []);

  return isTouchDevice;
};

// 向き検出フック
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const handleOrientationChange = () => {
      if (screen.orientation) {
        setOrientation(screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape');
      } else {
        // フォールバック
        setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      }
    };

    handleOrientationChange();

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
      return () => screen.orientation.removeEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('resize', handleOrientationChange);
      return () => window.removeEventListener('resize', handleOrientationChange);
    }
  }, []);

  return orientation;
};

// オンライン状態フック
export const useIsOnline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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

// プリファーカラースキーム検出フック
export const usePrefersDarkMode = () => {
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
};

// 動きの削減設定検出フック
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
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
    if ('getBattery' in navigator) {
      // @ts-ignore - Battery API は実験的機能
      navigator.getBattery().then((battery: any) => {
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

        return () => {
          battery.removeEventListener('chargingchange', updateBatteryInfo);
          battery.removeEventListener('levelchange', updateBatteryInfo);
        };
      });
    }
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
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
  };
};

// アダプティブローディング（低電力モードやネットワーク状態に応じた最適化）
export const useAdaptiveLoading = () => {
  const { isOnline } = useIsOnline();
  const batteryInfo = useBatteryInfo();
  const { isMobile } = useBreakpoint();

  // 低電力モードかどうかを判定
  const isLowPowerMode = batteryInfo && batteryInfo.level < 0.2 && !batteryInfo.charging;
  
  // データセーバーモード（実験的）
  const isDataSaverMode = 'connection' in navigator && 
    // @ts-ignore
    navigator.connection?.saveData === true;

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
  };
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
