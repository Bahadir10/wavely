import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationArtwork, gradientFor } from '@/components/station-artwork';
import { Visualizer } from '@/components/visualizer';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { radius, spacing } from '@/theme/tokens';
import { formatTags } from '@/utils/format';

export default function PlayerScreen() {
  const { current, status, currentTrack, togglePlayback, stop } = usePlayerStore();
  const isFavorite = useFavoritesStore((s) => s.stations.some((f) => f.stationuuid === current?.stationuuid));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  useEffect(() => {
    if (!current && router.canGoBack()) router.back();
  }, [current]);

  if (!current) return null;

  const [from, to] = gradientFor(current.stationuuid);
  const details = [current.codec, current.bitrate ? `${current.bitrate} kbps` : null].filter(Boolean).join(' · ');

  return (
    <LinearGradient colors={[from, to, '#0D0B14']} locations={[0, 0.45, 1]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close player">
            <Ionicons name="chevron-down" size={30} color="#fff" />
          </Pressable>
          <Text style={styles.topLabel}>NOW PLAYING</Text>
          <Pressable
            onPress={() => {
              stop();
              router.back();
            }}
            hitSlop={12}
            accessibilityLabel="Stop"
          >
            <Ionicons name="stop-circle-outline" size={28} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.center}>
          <View style={styles.artShadow}>
            <StationArtwork station={current} size={240} rounded={radius.xl} />
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE BROADCAST</Text>
          </View>

          <Text numberOfLines={1} style={styles.name}>
            {current.name.trim()}
          </Text>

          {/* Currently playing song/artist banner */}
          {currentTrack ? (
            <View style={styles.songCard}>
              <Ionicons name="musical-notes" size={16} color="#FF6B6B" />
              <View style={styles.songTextContainer}>
                <Text numberOfLines={1} style={styles.songTitle}>
                  {currentTrack.title}
                </Text>
                {currentTrack.artist ? (
                  <Text numberOfLines={1} style={styles.songArtist}>
                    {currentTrack.artist}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text numberOfLines={1} style={styles.meta}>
              {[current.country, formatTags(current.tags)].filter(Boolean).join(' · ')}
            </Text>
          )}

          {!!details && <Text style={styles.details}>{details.toUpperCase()}</Text>}
        </View>

        <View style={styles.visualizer}>
          <Visualizer active={status === 'playing'} color="rgba(255,255,255,0.9)" bars={32} height={50} />
        </View>

        {status === 'error' && <Text style={styles.error}>This stream is temporarily unreachable.</Text>}

        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              toggleFavorite(current);
            }}
            hitSlop={12}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={30} color="#fff" />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              togglePlayback();
            }}
            style={({ pressed }) => [styles.playButton, pressed && { transform: [{ scale: 0.94 }] }]}
            accessibilityLabel={status === 'playing' ? 'Pause' : 'Play'}
          >
            {status === 'loading' ? (
              <ActivityIndicator color="#16131F" />
            ) : (
              <Ionicons name={status === 'playing' ? 'pause' : 'play'} size={36} color="#16131F" />
            )}
          </Pressable>

          <Ionicons name="radio-outline" size={30} color="rgba(255,255,255,0.6)" />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  topLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  center: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.sm },
  artShadow: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
    marginBottom: spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF3B5C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.lg,
    maxWidth: '95%',
  },
  songTextContainer: { alignItems: 'center' },
  songTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  songArtist: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },
  meta: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '500' },
  details: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  visualizer: { alignItems: 'center', marginTop: 'auto' },
  error: { color: '#FFB4B4', textAlign: 'center', marginTop: spacing.md },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
