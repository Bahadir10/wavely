import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { translations, type Language } from '@/constants/i18n';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePreference;
  language: Language;
  countryCode: string;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (lang: Language) => void;
  setCountryCode: (code: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'tr',
      countryCode: 'TR',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCountryCode: (countryCode) => set({ countryCode }),
    }),
    { name: 'wavely-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  return translations[language] || translations.en;
}
