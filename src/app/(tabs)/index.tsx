import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { FeaturedCard } from '@/components/featured-card';
import { MusicPersonaCard } from '@/components/music-persona-card';
import { Screen, SectionTitle } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { StationRow } from '@/components/station-row';
import { GENRES, capitalize } from '@/constants/catalog';
import { useStations } from '@/hooks/use-stations';
import { rankRecommendedStations } from '@/services/recommendation-engine';
import { useFavoritesStore } from '@/store/favorites-store';
import { useSavedSongsStore } from '@/store/saved-songs-store';
import { useStatsStore } from '@/store/stats-store';
import { useI18n, useSettingsStore } from '@/store/settings-store';
import { spacing } from '@/theme/tokens';
import { greeting } from '@/utils/format';

export default function HomeScreen() {
  const countryCode = useSettingsStore((s) => s.countryCode);
  const language = useSettingsStore((s) => s.language);
  const t = useI18n();
  const [genre, setGenre] = useState<string | null>(null);

  const favorites = useFavoritesStore((s) => s.stations);
  const listeningGenres = useStatsStore((s) => s.genres);
  const savedSongs = useSavedSongsStore((s) => s.songs);

  const favoriteUuids = useMemo(() => new Set(favorites.map((f) => f.stationuuid)), [favorites]);

  const recommendationCandidates = useStations({
    countrycode: countryCode,
    order: 'votes',
    limit: 30,
  });

  const rankedRecommendations = useMemo(() => {
    if (!recommendationCandidates.data) return [];
    return rankRecommendedStations(
      recommendationCandidates.data,
      {
        listeningGenres,
        savedSongs,
        favoriteStationUuids: favoriteUuids,
        language,
      },
      10
    );
  }, [recommendationCandidates.data, listeningGenres, savedSongs, favoriteUuids, language]);

  const featured = useStations({ order: 'votes', limit: 10 });
  const popular = useStations({ countrycode: countryCode, tag: genre ?? undefined, limit: 25 });

  return (
    <Screen title="Wavely" subtitle={greeting()}>
      {/* Dynamic Music Persona Card & Listening Stats */}
      <MusicPersonaCard />

      {/* Top Carousel: Favorite Stations (Instant Access) */}
      {favorites.length > 0 && (
        <>
          <SectionTitle>{t.yourFavorites}</SectionTitle>
          <FlatList
            horizontal
            data={favorites}
            keyExtractor={(s) => `fav-${s.stationuuid}`}
            renderItem={({ item }) => <FeaturedCard station={item} queue={favorites} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            style={styles.bleed}
          />
        </>
      )}

      {/* Recommended For You (AI Multi-Vector Recommendation Engine) */}
      <SectionTitle>{t.recommendedForYou}</SectionTitle>
      {recommendationCandidates.isLoading ? (
        <StateView loading />
      ) : (
        <FlatList
          horizontal
          data={rankedRecommendations}
          keyExtractor={(item) => `rec-${item.station.stationuuid}`}
          renderItem={({ item }) => (
            <FeaturedCard
              station={item.station}
              queue={rankedRecommendations.map((r) => r.station)}
              badgeText={item.reasonBadge}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          style={styles.bleed}
        />
      )}

      <SectionTitle>{t.featured}</SectionTitle>
      {featured.isLoading ? (
        <StateView loading />
      ) : (
        <FlatList
          horizontal
          data={featured.data}
          keyExtractor={(s) => s.stationuuid}
          renderItem={({ item }) => <FeaturedCard station={item} queue={featured.data} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          style={styles.bleed}
        />
      )}

      <SectionTitle>{t.genres}</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}
      >
        <Chip label={t.all} selected={genre === null} onPress={() => setGenre(null)} />
        {GENRES.map((g) => (
          <Chip key={g} label={capitalize(g)} selected={genre === g} onPress={() => setGenre(g)} />
        ))}
      </ScrollView>

      <SectionTitle>{t.popularNearYou}</SectionTitle>
      {popular.isLoading ? (
        <StateView loading />
      ) : popular.isError ? (
        <StateView icon="cloud-offline-outline" title={t.couldNotLoad} onRetry={popular.refetch} />
      ) : popular.data?.length === 0 ? (
        <StateView title={t.noResults} message={t.tryDifferent} />
      ) : (
        <View style={styles.list}>
          {popular.data?.map((s) => (
            <StationRow key={s.stationuuid} station={s} queue={popular.data} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  carousel: { paddingHorizontal: spacing.lg, gap: spacing.md },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  list: { gap: spacing.sm },
});
