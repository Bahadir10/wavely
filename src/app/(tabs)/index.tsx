import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { FeaturedCard } from '@/components/featured-card';
import { Screen, SectionTitle } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { StationRow } from '@/components/station-row';
import { GENRES, capitalize } from '@/constants/catalog';
import { useStations } from '@/hooks/use-stations';
import { useFavoritesStore } from '@/store/favorites-store';
import { useI18n, useSettingsStore } from '@/store/settings-store';
import { spacing } from '@/theme/tokens';
import { greeting } from '@/utils/format';

export default function HomeScreen() {
  const countryCode = useSettingsStore((s) => s.countryCode);
  const t = useI18n();
  const [genre, setGenre] = useState<string | null>(null);

  const favorites = useFavoritesStore((s) => s.stations);
  const featured = useStations({ order: 'votes', limit: 10 });
  const popular = useStations({ countrycode: countryCode, tag: genre ?? undefined, limit: 25 });

  return (
    <Screen title="Wavely" subtitle={greeting()}>
      {/* Top Carousel: Favorite Stations (Instant Access) */}
      {favorites.length > 0 && (
        <>
          <SectionTitle>{t.yourFavorites}</SectionTitle>
          <FlatList
            horizontal
            data={favorites}
            keyExtractor={(s) => `fav-${s.stationuuid}`}
            renderItem={({ item }) => <FeaturedCard station={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            style={styles.bleed}
          />
        </>
      )}

      <SectionTitle>{t.featured}</SectionTitle>
      {featured.isLoading ? (
        <StateView loading />
      ) : (
        <FlatList
          horizontal
          data={featured.data}
          keyExtractor={(s) => s.stationuuid}
          renderItem={({ item }) => <FeaturedCard station={item} />}
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
            <StationRow key={s.stationuuid} station={s} />
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
