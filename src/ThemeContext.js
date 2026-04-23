import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './theme';

const defaultShadow = {
  sm: { shadowColor: '#1a2d25', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: '#1a2d25', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
};
const darkShadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
};

const ThemeContext = createContext(null);

/**
 * initialTheme: 'light' | 'dark' | null  (null = follow system)
 * onThemeChange: (mode: 'light'|'dark'|null) => void  — caller persists to DB
 */
export function ThemeProvider({ children, initialTheme = null, onThemeChange }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState(initialTheme);

  const isDark = override === 'dark' || (override === null && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;
  const shadow = isDark ? darkShadow : defaultShadow;

  function setTheme(mode) {
    // mode: 'light' | 'dark' | null
    setOverride(mode);
    if (onThemeChange) onThemeChange(mode);
  }

  return (
    <ThemeContext.Provider value={{ isDark, colors, shadow, setTheme, override }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components rendered outside provider during init
    return {
      isDark: false,
      colors: lightColors,
      shadow: defaultShadow,
      setTheme: () => {},
      override: null,
    };
  }
  return ctx;
}
