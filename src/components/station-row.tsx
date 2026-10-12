import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Station } from '@/api/types';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';
import { formatTags } from '@/utils/format';
import { StationArtwork } from './station-artwork';

export function StationRow({ station, queue }: { station: Station; queue?: Station[] }) {
  const { colors } = useTheme();
  const play = usePlayerStore((s) => s.play);
  const isCurrent = usePlayerStore((s) => s.current?.stationuuid === station.stationuuid);
  const isFavorite = useFavoritesStore((s) => s.stations.some((f) => f.stationuuid === station.stationuuid));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  return (
    <Pressable
      onPress={() => play(station, queue)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: isCurrent ? colors.primary : colors.border },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Play ${station.name}`}
    >
      <StationArtwork station={station} size={52} />
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {station.name.trim()}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>
          {[station.country, formatTags(station.tags, 2)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Pressable
        hitSlop={12}
        onPress={() => {
          Haptics.selectionAsync();
          toggleFavorite(station);
        }}
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={22}
          color={isFavorite ? colors.accent : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, fontWeight: '500' },
});
