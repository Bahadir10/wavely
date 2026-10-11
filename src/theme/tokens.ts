/**
 * Design tokens shared by light and dark themes.
 */
export const palette = {
  violet: '#6C3BFF',
  coral: '#FF6B6B',
  pink: '#FF4D9D',
  live: '#FF3B5C',
};

export const lightColors = {
  background: '#F6F5FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEECF7',
  text: '#16131F',
  textMuted: '#6E6A80',
  border: '#E3E0EE',
  primary: palette.violet,
  accent: palette.coral,
  live: palette.live,
  tabBar: 'rgba(255,255,255,0.92)',
};

export const darkColors: typeof lightColors = {
  background: '#0D0B14',
  surface: '#17141F',
  surfaceAlt: '#221E2D',
  text: '#F4F2FA',
  textMuted: '#9A95AD',
  border: '#2A2636',
  primary: '#8B64FF',
  accent: palette.coral,
  live: palette.live,
  tabBar: 'rgba(23,20,31,0.92)',
};

export type ThemeColors = typeof lightColors;

export const gradients = {
  brand: [palette.violet, palette.coral] as const,
  sunset: ['#FF8A5B', '#FF4D9D'] as const,
  ocean: ['#3B82F6', '#6C3BFF'] as const,
  mint: ['#10B981', '#3B82F6'] as const,
  night: ['#4C1D95', '#DB2777'] as const,
};

export const gradientList = Object.values(gradients);

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 };

export const typography = {
  title: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
};
