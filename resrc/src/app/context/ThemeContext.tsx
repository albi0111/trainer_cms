import React, { createContext, useContext, useState } from 'react';

export type Theme = 'dark' | 'light' | 'yellow';

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  bgOverlay: string;
  bgSidebar: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentHover: string;
  accentFg: string;
  border: string;
  borderSubtle: string;
  danger: string;
  success: string;
  warning: string;
  shadow: string;
}

export const themeColors: Record<Theme, ThemeColors> = {
  dark: {
    bg: '#0F0F0F',
    bgCard: '#1A1A1A',
    bgCardHover: '#222222',
    bgInput: '#242424',
    bgOverlay: 'rgba(0,0,0,0.85)',
    bgSidebar: '#141414',
    text: '#F0F0F0',
    textMuted: '#909090',
    textSubtle: '#555555',
    accent: '#F5E642',
    accentHover: '#F0DC30',
    accentFg: '#111111',
    border: '#2A2A2A',
    borderSubtle: '#222222',
    danger: '#FF4455',
    success: '#3DCC88',
    warning: '#FF9900',
    shadow: 'rgba(0,0,0,0.5)',
  },
  light: {
    bg: '#F5F5F5',
    bgCard: '#FFFFFF',
    bgCardHover: '#F9F9F9',
    bgInput: '#F0F0F0',
    bgOverlay: 'rgba(0,0,0,0.6)',
    bgSidebar: '#EFEFEF',
    text: '#111111',
    textMuted: '#666666',
    textSubtle: '#AAAAAA',
    accent: '#F5E642',
    accentHover: '#EDD930',
    accentFg: '#111111',
    border: '#E5E5E5',
    borderSubtle: '#F0F0F0',
    danger: '#E53E3E',
    success: '#38A169',
    warning: '#DD6B20',
    shadow: 'rgba(0,0,0,0.08)',
  },
  yellow: {
    bg: '#F5E642',
    bgCard: '#FFFEF5',
    bgCardHover: '#FFFCE0',
    bgInput: '#FFFBD0',
    bgOverlay: 'rgba(0,0,0,0.65)',
    bgSidebar: '#EDD930',
    text: '#111111',
    textMuted: '#444444',
    textSubtle: '#888888',
    accent: '#111111',
    accentHover: '#333333',
    accentFg: '#F5E642',
    border: '#D4B400',
    borderSubtle: '#E8D000',
    danger: '#CC0000',
    success: '#006633',
    warning: '#884400',
    shadow: 'rgba(0,0,0,0.12)',
  },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('fp-theme') as Theme) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try { localStorage.setItem('fp-theme', newTheme); } catch {}
  };

  const t = themeColors[theme];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, t }}>
      <div
        style={{
          background: t.bg,
          color: t.text,
          minHeight: '100vh',
          fontFamily: 'Inter, sans-serif',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
