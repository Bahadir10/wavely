import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationArtwork, gradientFor } from '@/components/station-artwork';
import { Visualizer } from '@/components/visualizer';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useSavedSongsStore } from '@/store/saved-songs-store';
import { useI18n } from '@/store/settings-store';
import { radius, spacing } from '@/theme/tokens';
import { formatTags } from '@/utils/format';

export default function PlayerScreen() {
  const t = useI18n();
  const { current, status, currentTrack, togglePlayback, stop, refreshTrack } = usePlayerStore();
  const isFavorite = useFavoritesStore((s) => s.stations.some((f) => f.stationuuid === current?.stationuuid));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  const songs = useSavedSongsStore((s) => s.songs);
  const saveSong = useSavedSongsStore((s) => s.saveSong);
  const removeSong = useSavedSongsStore((s) => s.removeSong);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Directly derive reactive boolean from zustand songs array state
  const songIsLiked = currentTrack
    ? songs.some((s) => s.id === `${currentTrack.title}-${currentTrack.artist || ''}`.toLowerCase())
    : false;

  useEffect(() => {
    if (!current && router.canGoBack()) router.back();
  }, [current]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  if (!current) return null;

  const [from, to] = gradientFor(current.stationuuid);
  const details = [current.codec, current.bitrate ? `${current.bitrate} kbps` : null].filter(Boolean).join(' · ');

  const handleToggleSongLike = () => {
    if (!currentTrack || !current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const songId = `${currentTrack.title}-${currentTrack.artist || ''}`.toLowerCase();
    if (songIsLiked) {
      removeSong(songId);
      showToast(t.songRemoved);
    } else {
      saveSong({
        title: currentTrack.title,
        artist: currentTrack.artist,
        stationName: current.name,
        stationId: current.stationuuid,
      });
      showToast(t.songSaved);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    Haptics.selectionAsync();
    await refreshTrack();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleShareStation = async () => {
    try {
      Haptics.selectionAsync();
      await Share.share({
        message: `📻 Listening to ${current.name} on Wavely Radio! http://radio-browser.info`,
        title: current.name,
      });
    } catch {}
  };

  const handleOpenYouTube = () => {
    if (!currentTrack) return;
    const query = encodeURIComponent(`${currentTrack.artist ? `${currentTrack.artist} ` : ''}${currentTrack.title}`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  return (
    <LinearGradient colors={[from, to, '#0D0B14']} locations={[0, 0.45, 1]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        {/* Floating Toast Notification */}
        {toastMessage && (
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close player">
            <Ionicons name="chevron-down" size={30} color="#fff" />
          </Pressable>
          <Text style={styles.topLabel}>{t.nowPlaying}</Text>
          <View style={styles.topActions}>
            <Pressable onPress={handleShareStation} hitSlop={12} accessibilityLabel="Share station">
              <Ionicons name="share-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                stop();
                router.back();
              }}
              hitSlop={12}
              accessibilityLabel="Stop"
            >
              <Ionicons name="stop-circle-outline" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.center}>
          <View style={styles.artShadow}>
            <StationArtwork station={current} size={220} rounded={radius.xl} />
          </View>

          <View style={styles.liveBadgeRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t.liveBroadcast}</Text>
            </View>
            <Pressable
              onPress={handleManualRefresh}
              hitSlop={8}
              style={styles.refreshBadge}
              accessibilityLabel={t.refreshMetadata}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={14} color="#fff" />
              )}
            </Pressable>
          </View>

          <Text numberOfLines={1} style={styles.name}>
            {current.name.trim()}
          </Text>

          {/* Currently playing song/artist banner + REACTIVE LIKE SONG BUTTON */}
          {currentTrack ? (
            <View style={styles.songCard}>
              {currentTrack.artwork ? (
                <Image source={{ uri: currentTrack.artwork }} style={styles.songArtwork} />
              ) : (
                <View style={styles.songIconWrap}>
                  <Ionicons name="musical-notes" size={18} color="#FF6B6B" />
                </View>
              )}

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

              <View style={styles.songActionsRow}>
                <Pressable
                  onPress={handleOpenYouTube}
                  hitSlop={8}
                  style={styles.ytBtn}
                  accessibilityLabel={t.searchYouTube}
                >
                  <Ionicons name="logo-youtube" size={16} color="#FF4444" />
                </Pressable>

                <Pressable
                  onPress={handleToggleSongLike}
                  hitSlop={10}
                  style={[styles.likeSongBtn, songIsLiked && styles.likeSongBtnActive]}
                  accessibilityLabel="Like song"
                >
                  <Ionicons
                    name={songIsLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={songIsLiked ? '#FF3B5C' : '#FFFFFF'}
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.liveMetaCard}>
              <Text numberOfLines={1} style={styles.meta}>
                {[current.country, formatTags(current.tags)].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}

          {!!details && <Text style={styles.details}>{details.toUpperCase()}</Text>}
        </View>

        <View style={styles.visualizer}>
          <Visualizer active={status === 'playing'} color="rgba(255,255,255,0.9)" bars={32} height={46} />
        </View>

        {status === 'error' && <Text style={styles.error}>{t.streamUnavailable}</Text>}

        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              toggleFavorite(current);
            }}
            hitSlop={12}
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={32} color="#fff" />
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

          <Pressable onPress={handleShareStation} hitSlop={12} accessibilityLabel="Share">
            <Ionicons name="share-social-outline" size={28} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toast: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 12, 28, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  center: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg, gap: spacing.sm },
  artShadow: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
    marginBottom: spacing.xs,
  },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF3B5C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  refreshBadge: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    maxWidth: '96%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  songIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songArtwork: { width: 40, height: 40, borderRadius: radius.sm },
  songTextContainer: { alignItems: 'flex-start', flexShrink: 1, flex: 1 },
  songTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  songArtist: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  songActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ytBtn: {
    padding: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  likeSongBtn: {
    padding: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  likeSongBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  liveMetaCard: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  meta: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
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
