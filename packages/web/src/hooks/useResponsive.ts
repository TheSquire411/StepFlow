import { useState, useEffect } from 'react';

interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export const useResponsive = (breakpoints: Partial<BreakpointConfig> = {}) => {
  const config = { ...defaultBreakpoints, ...breakpoints };
  
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < config.md;
  const isTablet = windowSize.width >= config.md && windowSize.width < config.lg;
  const isDesktop = windowSize.width >= config.lg;
  
  const isSmallScreen = windowSize.width < config.sm;
  const isMediumScreen = windowSize.width >= config.sm && windowSize.width < config.md;
  const isLargeScreen = windowSize.width >= config.md && windowSize.width < config.lg;
  const isExtraLargeScreen = windowSize.width >= config.lg && windowSize.width < config.xl;
  const is2ExtraLargeScreen = windowSize.width >= config.xl;

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isExtraLargeScreen,
    is2ExtraLargeScreen,
    breakpoint: windowSize.width >= config['2xl'] ? '2xl' :
                windowSize.width >= config.xl ? 'xl' :
                windowSize.width >= config.lg ? 'lg' :
                windowSize.width >= config.md ? 'md' :
                windowSize.width >= config.sm ? 'sm' : 'xs'
  };
};