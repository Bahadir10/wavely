import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { StateView } from '@/components/state-view';
import { StationRow } from '@/components/station-row';
import { COUNTRIES, GENRES, capitalize } from '@/constants/catalog';
import { useStations } from '@/hooks/use-stations';
import { useI18n } from '@/store/settings-store';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const t = useI18n();
  const [text, setText] = useState('');
  const [genre, setGenre] = useState<string | undefined>();
  const [country, setCountry] = useState<string | undefined>();
  const name = useDebounced(text.trim());

  const hasFilter = !!name || !!genre || !!country;
  const { data, isFetching, isError, refetch } = useStations(
    { name: name || undefined, tag: genre, countrycode: country, limit: 50 },
    hasFilter,
  );

  return (
    <Screen title={t.search} scroll={false}>
      <View style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.textInput, { color: colors.text }]}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {GENRES.map((g) => (
            <Chip
              key={g}
              label={capitalize(g)}
              selected={genre === g}
              onPress={() => setGenre(genre === g ? undefined : g)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {COUNTRIES.map((c) => (
            <Chip
              key={c.code}
              label={c.name}
              selected={country === c.code}
              onPress={() => setCountry(country === c.code ? undefined : c.code)}
            />
          ))}
        </ScrollView>
      </View>

      {!hasFilter ? (
        <StateView
          icon="search-outline"
          title={t.findStation}
          message={t.searchHint}
        />
      ) : isFetching && !data ? (
        <StateView loading />
      ) : isError ? (
        <StateView icon="cloud-offline-outline" title={t.couldNotLoad} onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(s) => s.stationuuid}
          renderItem={({ item }) => <StationRow station={item} queue={data} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={<StateView title={t.noResults} message={t.tryDifferent} />}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
  },
  textInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  chips: { gap: spacing.sm, paddingTop: spacing.md },
  list: { paddingTop: spacing.lg, paddingBottom: 140 },
});
