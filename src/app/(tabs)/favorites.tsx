import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { StationRow } from '@/components/station-row';
import { useFavoritesStore } from '@/store/favorites-store';
import { spacing } from '@/theme/tokens';

export default function FavoritesScreen() {
  const stations = useFavoritesStore((s) => s.stations);

  return (
    <Screen title="Favorites" subtitle={`${stations.length} saved`}>
      {stations.length === 0 ? (
        <StateView
          icon="heart-outline"
          title="No favorites yet"
          message="Tap the heart on any station to save it here."
        />
      ) : (
        <View style={styles.list}>
          {stations.map((s) => (
            <StationRow key={s.stationuuid} station={s} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.sm } });
