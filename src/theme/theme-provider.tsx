import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';
import { darkColors, lightColors, type ThemeColors } from './tokens';

interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ colors: lightColors, isDark: false });

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const preference = useSettingsStore((s) => s.theme);
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';

  return (
    <ThemeContext.Provider value={{ colors: isDark ? darkColors : lightColors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
