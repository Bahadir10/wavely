import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { StationRow } from '@/components/station-row';
import { useFavoritesStore } from '@/store/favorites-store';
import { useSavedSongsStore } from '@/store/saved-songs-store';
import { useI18n } from '@/store/settings-store';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const t = useI18n();
  const [activeTab, setActiveTab] = useState<'stations' | 'songs'>('stations');

  const stations = useFavoritesStore((s) => s.stations);
  const { songs, removeSong } = useSavedSongsStore();

  const handleOpenYouTube = (title: string, artist?: string) => {
    const query = encodeURIComponent(`${artist ? `${artist} ` : ''}${title}`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  const handleOpenSpotify = (title: string, artist?: string) => {
    const query = encodeURIComponent(`${artist ? `${artist} ` : ''}${title}`);
    Linking.openURL(`https://open.spotify.com/search/${query}`);
  };

  return (
    <Screen title={t.favorites} subtitle={activeTab === 'stations' ? `${stations.length} ${t.saved}` : `${songs.length} ${t.saved}`}>
      {/* Top Segmented Controls */}
      <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
        <Pressable
          onPress={() => setActiveTab('stations')}
          style={[styles.segmentBtn, activeTab === 'stations' && { backgroundColor: colors.surface }]}
        >
          <Ionicons
            name="radio-outline"
            size={18}
            color={activeTab === 'stations' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.segmentText, { color: activeTab === 'stations' ? colors.text : colors.textMuted }]}>
            {t.savedStations}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('songs')}
          style={[styles.segmentBtn, activeTab === 'songs' && { backgroundColor: colors.surface }]}
        >
          <Ionicons
            name="musical-notes-outline"
            size={18}
            color={activeTab === 'songs' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.segmentText, { color: activeTab === 'songs' ? colors.text : colors.textMuted }]}>
            {t.savedSongs}
          </Text>
        </Pressable>
      </View>

      {/* Stations Tab */}
      {activeTab === 'stations' && (
        <View style={styles.list}>
          {stations.length === 0 ? (
            <StateView icon="heart-outline" title={t.noFavoritesYet} message={t.tapHeartStation} />
          ) : (
            stations.map((s) => <StationRow key={s.stationuuid} station={s} queue={stations} />)
          )}
        </View>
      )}

      {/* Saved Songs Tab */}
      {activeTab === 'songs' && (
        <View style={styles.list}>
          {songs.length === 0 ? (
            <StateView icon="musical-notes-outline" title={t.noSavedSongsYet} message={t.tapHeartSong} />
          ) : (
            songs.map((song) => (
              <View
                key={song.id}
                style={[styles.songCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.songInfo}>
                  <Text numberOfLines={1} style={[styles.songTitle, { color: colors.text }]}>
                    {song.title}
                  </Text>
                  <Text numberOfLines={1} style={[styles.songArtist, { color: colors.textMuted }]}>
                    {[song.artist, song.stationName].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                <View style={styles.songActions}>
                  <Pressable
                    onPress={() => handleOpenSpotify(song.title, song.artist)}
                    style={[styles.actionIconBtn, { backgroundColor: '#1DB954' }]}
                    hitSlop={8}
                    accessibilityLabel={t.searchSpotify}
                  >
                    <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
                  </Pressable>

                  <Pressable
                    onPress={() => handleOpenYouTube(song.title, song.artist)}
                    style={[styles.actionIconBtn, { backgroundColor: '#FF0000' }]}
                    hitSlop={8}
                    accessibilityLabel={t.searchYouTube}
                  >
                    <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
                  </Pressable>

                  <Pressable
                    onPress={() => removeSong(song.id)}
                    hitSlop={8}
                    accessibilityLabel="Delete"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  list: { gap: spacing.sm },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 15, fontWeight: '700' },
  songArtist: { fontSize: 13, marginTop: 2 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
