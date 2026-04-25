export const colors = {
  // Backgrounds
  background: '#1A1A1A',
  overlay: 'rgba(0,0,0,0.88)',
  surface: '#262626',
  surfaceDark: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  surfaceYellow: '#2A2500',

  // Accents
  primary: '#FFD700',
  error: '#FF5252',
  
  // Text
  textPrimary: '#FFF',
  textSecondary: '#E0E0E0',
  textMuted: '#888',
  textDark: '#000',
  textPlaceholder: '#444',
  textLabel: '#666',
  textInactive: '#555',
  textLight: '#AAA',
  textInput: '#DDD',

  // Borders
  borderDefault: '#333',
  borderLight: '#444',
  borderContainer: '#282828',
  borderPrimary: '#FFD700',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 18,
  round: 9999,
};

export const typography = {
  sizes: {
    xxs: 10,
    xs: 11,
    sm: 13,
    md: 14,
    lg: 15,
    xl: 16,
    xxl: 22,
  },
  weights: {
    regular: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  }
};

export const commonStyles = {
  circularButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  } as const,
};
