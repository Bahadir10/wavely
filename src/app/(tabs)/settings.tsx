import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, SectionTitle } from '@/components/screen';
import { COUNTRIES } from '@/constants/catalog';
import { useSettingsStore, type ThemePreference } from '@/store/settings-store';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const THEMES: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { theme, setTheme, countryCode, setCountryCode } = useSettingsStore();

  return (
    <Screen title="Settings">
      <SectionTitle>Appearance</SectionTitle>
      <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
        {THEMES.map((t) => {
          const selected = theme === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setTheme(t.value)}
              style={[styles.segmentItem, selected && { backgroundColor: colors.surface }]}
              accessibilityState={{ selected }}
            >
              <Ionicons name={t.icon} size={18} color={selected ? colors.primary : colors.textMuted} />
              <Text style={[styles.segmentLabel, { color: selected ? colors.text : colors.textMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Region</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {COUNTRIES.map((c, i) => (
          <Pressable
            key={c.code}
            onPress={() => setCountryCode(c.code)}
            style={[styles.option, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
          >
            <Text style={[styles.optionLabel, { color: colors.text }]}>{c.name}</Text>
            {countryCode === c.code && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Wavely v{Constants.expoConfig?.version} · Stations by radio-browser.info
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.md },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  segmentLabel: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  footer: { textAlign: 'center', marginTop: spacing.xl, fontSize: 12 },
});
