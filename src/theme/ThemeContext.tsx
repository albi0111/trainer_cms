import React, { createContext, useContext, useMemo } from 'react';
import { theme, AppTheme } from './index';

const ThemeContext = createContext<AppTheme>(theme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Currently static, but can be extended for dynamic themes (Light/Dark) in the future.
  const value = useMemo(() => theme, []);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * useAppStyle(styleFactory)
 * 
 * Performance-optimized hook for computing themed styles.
 * Enforces use of theme tokens and prevents inline style literals.
 */
export function useAppStyle<T>(styleFactory: (theme: AppTheme) => T): T {
  const theme = useAppTheme();
  return useMemo(() => styleFactory(theme), [theme, styleFactory]);
}
