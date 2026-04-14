import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme, Theme } from '../../context/ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme, t } = useTheme();

  const options: { key: Theme; label: React.ReactNode }[] = [
    { key: 'dark', label: <Moon size={13} /> },
    { key: 'light', label: <Sun size={13} /> },
    { key: 'yellow', label: <span style={{ fontSize: '11px', fontWeight: 700 }}>Y</span> },
  ];

  return (
    <div style={{
      display: 'flex', gap: '4px', alignItems: 'center',
      background: t.bgInput,
      border: `1px solid ${t.border}`,
      borderRadius: '10px',
      padding: '3px',
    }}>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => setTheme(opt.key)}
          style={{
            width: '28px', height: '28px',
            borderRadius: '7px',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            background: theme === opt.key ? t.accent : 'transparent',
            color: theme === opt.key ? t.accentFg : t.textMuted,
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
