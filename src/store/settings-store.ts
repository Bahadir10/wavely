import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePreference;
  countryCode: string;
  setTheme: (theme: ThemePreference) => void;
  setCountryCode: (code: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      countryCode: 'TR',
      setTheme: (theme) => set({ theme }),
      setCountryCode: (countryCode) => set({ countryCode }),
    }),
    { name: 'wavely-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
