import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayerStore } from '@/store/player-store';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { StationArtwork } from './station-artwork';
import { Visualizer } from './visualizer';

/** Floating player shown above the tab bar while a station is selected. */
export function MiniPlayer() {
  const { colors, isDark } = useTheme();
  const current = usePlayerStore((s) => s.current);
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.togglePlayback);

  if (!current) return null;

  return (
    <Pressable onPress={() => router.push('/player')} style={styles.wrapper} accessibilityLabel="Open player">
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 0}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.container, { backgroundColor: colors.tabBar, borderColor: colors.border }]}
      >
        <StationArtwork station={current} size={44} rounded={radius.sm} />
        <View style={styles.info}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {current.name.trim()}
          </Text>
          <View style={styles.statusRow}>
            <Visualizer active={status === 'playing'} color={colors.primary} bars={8} height={12} />
            <Text style={[styles.status, { color: colors.textMuted }]}>
              {status === 'error' ? 'Stream unavailable' : status === 'loading' ? 'Connecting…' : 'Live'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={toggle}
          hitSlop={10}
          style={[styles.button, { backgroundColor: colors.primary }]}
          accessibilityLabel={status === 'playing' ? 'Pause' : 'Play'}
        >
          {status === 'loading' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name={status === 'playing' ? 'pause' : 'play'} size={20} color="#fff" />
          )}
        </Pressable>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  status: { fontSize: 12, fontWeight: '600' },
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
