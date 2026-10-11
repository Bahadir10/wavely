import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen, SectionTitle } from '@/components/screen';
import { COUNTRIES } from '@/constants/catalog';
import { useSettingsStore, type ThemePreference } from '@/store/settings-store';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { logger, type LogEntry } from '@/utils/logger';

const THEMES: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { theme, setTheme, countryCode, setCountryCode } = useSettingsStore();
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<readonly LogEntry[]>([]);

  const handleOpenLogs = () => {
    setLogs(logger.getLogs());
    setLogModalVisible(true);
  };

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

      <SectionTitle>Diagnostics & Developer</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={handleOpenLogs} style={styles.option}>
          <View style={styles.row}>
            <Ionicons name="terminal-outline" size={20} color={colors.primary} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>In-App Log Console</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Wavely v{Constants.expoConfig?.version} · Stations by radio-browser.info
      </Text>

      {/* Developer Log Modal */}
      <Modal visible={logModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Application Logs</Text>
            <Pressable onPress={() => setLogModalVisible(false)} hitSlop={10}>
              <Ionicons name="close-circle" size={28} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView style={styles.logList}>
            {logs.length === 0 ? (
              <Text style={[styles.emptyLogs, { color: colors.textMuted }]}>No logs recorded yet.</Text>
            ) : (
              logs.map((item) => (
                <View key={item.id} style={[styles.logItem, { borderColor: colors.border }]}>
                  <View style={styles.logMeta}>
                    <Text
                      style={[
                        styles.logLevel,
                        {
                          color:
                            item.level === 'error'
                              ? '#FF3B5C'
                              : item.level === 'warn'
                              ? '#FFA500'
                              : colors.primary,
                        },
                      ]}
                    >
                      [{item.level.toUpperCase()}]
                    </Text>
                    <Text style={[styles.logTag, { color: colors.textMuted }]}>{item.tag}</Text>
                    <Text style={[styles.logTime, { color: colors.textMuted }]}>
                      {item.timestamp.split('T')[1].slice(0, 8)}
                    </Text>
                  </View>
                  <Text style={[styles.logMessage, { color: colors.text }]}>{item.message}</Text>
                  {item.data ? (
                    <Text style={[styles.logData, { color: colors.textMuted }]}>
                      {typeof item.data === 'string' ? item.data : JSON.stringify(item.data, null, 2)}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  footer: { textAlign: 'center', marginTop: spacing.xl, fontSize: 12 },
  modalContainer: { flex: 1, padding: spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  logList: { flex: 1 },
  emptyLogs: { textAlign: 'center', marginTop: 40 },
  logItem: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  logLevel: { fontWeight: '700', fontSize: 11 },
  logTag: { fontWeight: '600', fontSize: 12 },
  logTime: { fontSize: 10, marginLeft: 'auto' },
  logMessage: { fontSize: 14, fontWeight: '500' },
  logData: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
});
