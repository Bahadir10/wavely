import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Station } from '@/api/types';
import { usePlayerStore } from '@/store/player-store';
import { radius, spacing } from '@/theme/tokens';
import { formatTags } from '@/utils/format';
import { StationArtwork, gradientFor } from './station-artwork';

export const FEATURED_CARD_WIDTH = 260;

export function FeaturedCard({ station, queue }: { station: Station; queue?: Station[] }) {
  const play = usePlayerStore((s) => s.play);

  return (
    <Pressable
      onPress={() => play(station, queue)}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityLabel={`Play ${station.name}`}
    >
      <LinearGradient
        colors={gradientFor(station.stationuuid)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.top}>
          <StationArtwork station={station} size={56} />
          <View style={styles.live}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View>
          <Text numberOfLines={1} style={styles.name}>
            {station.name.trim()}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {formatTags(station.tags, 2) || station.country}
          </Text>
        </View>
        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color="#16131F" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: FEATURED_CARD_WIDTH,
    height: 170,
    borderRadius: radius.xl,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', maxWidth: 180 },
  meta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 2, maxWidth: 180 },
  playButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
