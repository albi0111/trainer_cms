export const colors = {
  // Core
  background: '#0D0D0D', // Deep off-black for high contrast
  surface: '#1A1A1A', // Slightly lighter dark surface
  surfaceElevated: '#262626', // Elevated card surface
  border: '#333333', // Subtle neutral borders
  primary: '#FFEA00', // Bright Energy Yellow (matches logo vibe)

  // States
  success: '#00E676', // Green
  warning: '#FFEA00', // Same yellow for warnings
  danger: '#FF3B30', // Red
  info: '#00B0FF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3', // Neutral gray
  textTertiary: '#737373',

  // Semantic
  get clientActive() { return this.primary; }, // Use yellow for active states to match branding
  get clientInactive() { return this.textSecondary; },
  get sessionMissed() { return this.danger; },
  get sessionPending() { return this.warning; },
  get progressGood() { return this.success; },
  get progressFlat() { return this.textSecondary; },

  // Data Viz
  chartPrimary: '#FFEA00',
  chartSecondary: '#FFFFFF',
  chartTertiary: '#A3A3A3',
  chartBackground: '#1A1A1A',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.8)',
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
