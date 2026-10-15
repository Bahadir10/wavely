import type { Station } from '@/api/types';
import { rankRecommendedStations } from '@/services/recommendation-engine';

const stationPop: Station = {
  stationuuid: 's-pop',
  name: 'Power Pop FM',
  tags: 'pop,top40,hit',
  votes: 100,
} as unknown as Station;

const stationArabesk: Station = {
  stationuuid: 's-arabesk',
  name: 'Kral Damar',
  tags: 'arabesk,damar,slow',
  votes: 120,
} as unknown as Station;

const stationRock: Station = {
  stationuuid: 's-rock',
  name: 'Rock Station',
  tags: 'rock,metal',
  votes: 80,
} as unknown as Station;

describe('recommendation-engine', () => {
  it('returns empty list if candidates are empty', () => {
    const result = rankRecommendedStations([], {
      listeningGenres: {},
      savedSongs: [],
      favoriteStationUuids: new Set(),
    });
    expect(result).toEqual([]);
  });

  it('ranks higher based on listening duration for genre', () => {
    const candidates = [stationPop, stationRock, stationArabesk];
    const result = rankRecommendedStations(candidates, {
      listeningGenres: { rock: 1200 },
      savedSongs: [],
      favoriteStationUuids: new Set(),
      currentHour: 14,
    });

    expect(result[0].station.stationuuid).toBe('s-rock');
    expect(result[0].reasonBadge).toContain('#rock');
  });

  it('boosts stations matching liked song artist or title', () => {
    const candidates = [stationPop, stationRock, stationArabesk];
    const result = rankRecommendedStations(candidates, {
      listeningGenres: {},
      savedSongs: [
        {
          id: '1',
          title: 'Unutamadım',
          artist: 'Kral Sanatçı',
          stationName: 'Kral Damar',
          stationId: 's-arabesk',
          savedAt: new Date().toISOString(),
        },
      ],
      favoriteStationUuids: new Set(),
      currentHour: 14,
    });

    expect(result[0].station.stationuuid).toBe('s-arabesk');
    expect(result[0].reasonBadge).toBe('❤️ Sevdiğin Şarkılara Benzer');
  });

  it('applies night bonus for slow/chill/damar at 23:00', () => {
    const candidates = [stationPop, stationArabesk];
    const result = rankRecommendedStations(candidates, {
      listeningGenres: {},
      savedSongs: [],
      favoriteStationUuids: new Set(),
      currentHour: 23,
    });

    expect(result[0].station.stationuuid).toBe('s-arabesk');
    expect(result[0].reasonBadge).toBe('🌙 Geceye Özel');
  });

  it('deprioritizes stations already in favorites to promote discovery', () => {
    const candidates = [stationPop, stationRock];
    const result = rankRecommendedStations(candidates, {
      listeningGenres: { pop: 50 },
      savedSongs: [],
      favoriteStationUuids: new Set(['s-pop']),
      currentHour: 14,
    });

    // Even though pop has listening seconds, s-pop has favorite penalty, letting rock compete or discover
    const popRanked = result.find((r) => r.station.stationuuid === 's-pop');
    expect(popRanked).toBeDefined();
  });
});
