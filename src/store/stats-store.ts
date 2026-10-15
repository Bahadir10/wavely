import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Station } from '@/api/types';

export interface MusicPersona {
  title: string;
  badge: string;
  description: string;
  topGenre: string;
}

interface StationStat {
  name: string;
  stationuuid: string;
  seconds: number;
  favicon?: string;
  genre?: string;
}

interface StatsState {
  totalSeconds: number;
  stations: Record<string, StationStat>;
  genres: Record<string, number>;
  recordListeningTime: (station: Station, secondsDelta?: number) => void;
  getPersona: () => MusicPersona;
  getTopStations: (limit?: number) => StationStat[];
  getTopGenre: () => string | null;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      totalSeconds: 0,
      stations: {},
      genres: {},

      recordListeningTime: (station, secondsDelta = 1) => {
        const { totalSeconds, stations, genres } = get();
        const uuid = station.stationuuid;
        const currentStationStat = stations[uuid] || {
          name: station.name,
          stationuuid: uuid,
          seconds: 0,
          favicon: station.favicon,
          genre: station.tags?.split(',')[0]?.trim().toLowerCase() || 'pop',
        };

        const updatedStationStat = {
          ...currentStationStat,
          seconds: currentStationStat.seconds + secondsDelta,
          favicon: station.favicon || currentStationStat.favicon,
        };

        const primaryGenre = (station.tags?.split(',')[0] || 'pop').trim().toLowerCase();
        const currentGenreSeconds = genres[primaryGenre] || 0;

        set({
          totalSeconds: totalSeconds + secondsDelta,
          stations: {
            ...stations,
            [uuid]: updatedStationStat,
          },
          genres: {
            ...genres,
            [primaryGenre]: currentGenreSeconds + secondsDelta,
          },
        });
      },

      getTopStations: (limit = 5) => {
        const { stations } = get();
        return Object.values(stations)
          .sort((a, b) => b.seconds - a.seconds)
          .slice(0, limit);
      },

      getTopGenre: () => {
        const { genres } = get();
        const entries = Object.entries(genres);
        if (entries.length === 0) return null;
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
      },

      getPersona: (): MusicPersona => {
        const { genres, totalSeconds } = get();
        const entries = Object.entries(genres).sort((a, b) => b[1] - a[1]);
        const topGenre = entries[0]?.[0] || 'general';

        if (totalSeconds < 60) {
          return {
            title: 'Müzik Kâşifi',
            badge: '🎧',
            description: 'Wavely dünyasında yeni istasyonlar ve tarzlar keşfediyor.',
            topGenre: 'Keşif',
          };
        }

        if (topGenre.includes('arabesk') || topGenre.includes('damar')) {
          return {
            title: 'Damar & Hüzün Ustası',
            badge: '👑',
            description: 'Duyguların en derin yerinde, gecenin hüznünde yankılanan melodilerin sadık dinleyicisi.',
            topGenre: 'Arabesk',
          };
        }

        if (topGenre.includes('slow') || topGenre.includes('chill') || topGenre.includes('akustik')) {
          return {
            title: 'Gece Kuşu & Dingin Ruh',
            badge: '🌙',
            description: 'Huzurlu ve sakin melodilerle ruhunu dinlendiren, sessizliğin ritmini yakalayan dinleyici.',
            topGenre: 'Slow & Akustik',
          };
        }

        if (topGenre.includes('pop') || topGenre.includes('dance') || topGenre.includes('club')) {
          return {
            title: 'Hit Avcısı & Pop Enerjisi',
            badge: '⚡',
            description: 'Radyoların en hareketli hitleriyle temposunu daima zirvede tutan dinamik dinleyici.',
            topGenre: 'Türkçe & Yabancı Pop',
          };
        }

        if (topGenre.includes('rock') || topGenre.includes('metal')) {
          return {
            title: 'Özgür Ruh & Rock Ateşi',
            badge: '🎸',
            description: 'Gitar riffleri ve yüksek tempolu ritimlerle yaşayan tavizsiz müzik tutkunu.',
            topGenre: 'Rock',
          };
        }

        if (topGenre.includes('jazz') || topGenre.includes('klasik') || topGenre.includes('classical')) {
          return {
            title: 'Sofistike Müzik Gurmesi',
            badge: '🎷',
            description: 'Zarif armoniler ve klasik tınıların inceliklerini takdir eden seçkin zevk sahibi.',
            topGenre: 'Caz & Klasik',
          };
        }

        return {
          title: 'Eklektik Müzik Tutkunu',
          badge: '✨',
          description: 'Tek bir türe bağlı kalmayan, her tarzın en iyisini harmanlayan geniş vizyonlu dinleyici.',
          topGenre: topGenre,
        };
      },
    }),
    {
      name: 'wavely-listening-stats',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        totalSeconds: s.totalSeconds,
        stations: s.stations,
        genres: s.genres,
      }),
    }
  )
);
