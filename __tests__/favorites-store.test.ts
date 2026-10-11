import type { Station } from '@/api/types';
import { useFavoritesStore } from '@/store/favorites-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const station = { stationuuid: 'abc', name: 'Test FM' } as Station;

describe('favorites store', () => {
  beforeEach(() => useFavoritesStore.setState({ stations: [] }));

  it('adds and removes a station', () => {
    useFavoritesStore.getState().toggle(station);
    expect(useFavoritesStore.getState().isFavorite('abc')).toBe(true);

    useFavoritesStore.getState().toggle(station);
    expect(useFavoritesStore.getState().isFavorite('abc')).toBe(false);
  });
});
