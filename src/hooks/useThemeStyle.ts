import { useState, useEffect, useCallback } from 'react';

export type ThemeStyle = 'warm' | 'dark-gold' | 'parchment';

const THEME_STORAGE_KEY = 'readtrip_theme';

const THEME_ORDER: ThemeStyle[] = ['warm', 'dark-gold', 'parchment'];

export function useThemeStyle() {
  const [theme, setTheme] = useState<ThemeStyle>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'warm' || stored === 'dark-gold' || stored === 'parchment') {
        return stored;
      }
    }
    return 'warm';
  });

  useEffect(() => {
    // 更新 document 的 class
    const root = document.documentElement;
    
    // 移除所有主题类
    root.classList.remove('theme-warm', 'theme-dark-gold', 'theme-parchment');
    
    // 添加当前主题类
    root.classList.add(`theme-${theme}`);
    
    // 保存到 localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  const setThemeStyle = useCallback((newTheme: ThemeStyle) => {
    setTheme(newTheme);
  }, []);

  return {
    theme,
    toggleTheme,
    setThemeStyle,
    isWarm: theme === 'warm',
    isDarkGold: theme === 'dark-gold',
    isParchment: theme === 'parchment',
  };
}
