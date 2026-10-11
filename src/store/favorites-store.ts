import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Station } from '@/api/types';

interface FavoritesState {
  // Full station objects are stored so favorites work offline without extra requests.
  stations: Station[];
  isFavorite: (id: string) => boolean;
  toggle: (station: Station) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      stations: [],
      isFavorite: (id) => get().stations.some((s) => s.stationuuid === id),
      toggle: (station) =>
        set((state) => ({
          stations: state.stations.some((s) => s.stationuuid === station.stationuuid)
            ? state.stations.filter((s) => s.stationuuid !== station.stationuuid)
            : [station, ...state.stations],
        })),
    }),
    {
      name: 'wavely-favorites',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ stations: s.stations }),
    },
  ),
);
