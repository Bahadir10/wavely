import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SavedSong {
  id: string;
  title: string;
  artist?: string;
  stationName: string;
  stationId: string;
  savedAt: string;
}

interface SavedSongsState {
  songs: SavedSong[];
  saveSong: (song: Omit<SavedSong, 'id' | 'savedAt'>) => void;
  removeSong: (id: string) => void;
  isSongSaved: (title: string, artist?: string) => boolean;
}

export const useSavedSongsStore = create<SavedSongsState>()(
  persist(
    (set, get) => ({
      songs: [],
      saveSong: (song) => {
        const id = `${song.title}-${song.artist || ''}`.toLowerCase();
        if (get().songs.some((s) => s.id === id)) return;
        const newSong: SavedSong = {
          ...song,
          id,
          savedAt: new Date().toISOString(),
        };
        set((state) => ({ songs: [newSong, ...state.songs] }));
      },
      removeSong: (id) =>
        set((state) => ({ songs: state.songs.filter((s) => s.id !== id) })),
      isSongSaved: (title, artist) => {
        const id = `${title}-${artist || ''}`.toLowerCase();
        return get().songs.some((s) => s.id === id);
      },
    }),
    {
      name: 'wavely-saved-songs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
