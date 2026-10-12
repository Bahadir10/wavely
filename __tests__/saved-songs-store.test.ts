jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useSavedSongsStore } from '@/store/saved-songs-store';

describe('savedSongsStore', () => {
  beforeEach(() => {
    useSavedSongsStore.setState({ songs: [] });
  });

  it('saves a new song and avoids duplicates', () => {
    const store = useSavedSongsStore.getState();
    store.saveSong({
      title: 'Doldum',
      artist: 'Ahiyan',
      stationName: 'Virgin Radio Türkiye',
      stationId: 'virgin-radio-turkey',
    });

    const updated = useSavedSongsStore.getState();
    expect(updated.songs).toHaveLength(1);
    expect(updated.songs[0].title).toBe('Doldum');
    expect(updated.songs[0].artist).toBe('Ahiyan');
    expect(updated.isSongSaved('Doldum', 'Ahiyan')).toBe(true);

    // Try saving duplicate
    updated.saveSong({
      title: 'Doldum',
      artist: 'Ahiyan',
      stationName: 'Virgin Radio Türkiye',
      stationId: 'virgin-radio-turkey',
    });
    expect(useSavedSongsStore.getState().songs).toHaveLength(1);
  });

  it('removes a saved song by id', () => {
    const store = useSavedSongsStore.getState();
    store.saveSong({
      title: 'Kime Asiksin',
      artist: 'Gullu',
      stationName: 'Arabesk FM',
      stationId: 'arabesk-fm-turkey',
    });

    const songId = useSavedSongsStore.getState().songs[0].id;
    useSavedSongsStore.getState().removeSong(songId);

    expect(useSavedSongsStore.getState().songs).toHaveLength(0);
    expect(useSavedSongsStore.getState().isSongSaved('Kime Asiksin', 'Gullu')).toBe(false);
  });
});
