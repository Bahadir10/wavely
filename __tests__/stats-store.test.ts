import type { Station } from '@/api/types';
import { useStatsStore } from '@/store/stats-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockStationPop: Station = {
  stationuuid: 'station-pop-1',
  name: 'Power FM',
  url: 'http://test.com/pop',
  url_resolved: 'http://test.com/pop',
  tags: 'pop,top40,hit',
  countrycode: 'TR',
} as unknown as Station;

const mockStationArabesk: Station = {
  stationuuid: 'station-damar-1',
  name: 'Kral FM',
  url: 'http://test.com/damar',
  url_resolved: 'http://test.com/damar',
  tags: 'arabesk,damar',
  countrycode: 'TR',
} as unknown as Station;

describe('stats-store', () => {
  beforeEach(() => {
    useStatsStore.setState({
      totalSeconds: 0,
      stations: {},
      genres: {},
    });
  });

  it('initializes with default values and explorer persona', () => {
    const persona = useStatsStore.getState().getPersona();
    expect(persona.title).toBe('Müzik Kâşifi');
    expect(persona.badge).toBe('🎧');
    expect(useStatsStore.getState().totalSeconds).toBe(0);
    expect(useStatsStore.getState().getTopStations()).toEqual([]);
    expect(useStatsStore.getState().getTopGenre()).toBeNull();
  });

  it('records listening time and updates station and genre totals', () => {
    useStatsStore.getState().recordListeningTime(mockStationPop, 30);
    useStatsStore.getState().recordListeningTime(mockStationPop, 40);

    const state = useStatsStore.getState();
    expect(state.totalSeconds).toBe(70);
    expect(state.stations['station-pop-1'].seconds).toBe(70);
    expect(state.genres['pop']).toBe(70);
    expect(state.getTopGenre()).toBe('pop');
  });

  it('computes top stations correctly', () => {
    useStatsStore.getState().recordListeningTime(mockStationPop, 100);
    useStatsStore.getState().recordListeningTime(mockStationArabesk, 300);

    const top = useStatsStore.getState().getTopStations(2);
    expect(top).toHaveLength(2);
    expect(top[0].stationuuid).toBe('station-damar-1');
    expect(top[0].seconds).toBe(300);
    expect(top[1].stationuuid).toBe('station-pop-1');
    expect(top[1].seconds).toBe(100);
  });

  it('awards persona Damar & Hüzün Ustası when arabesk is dominant and time exceeds threshold', () => {
    useStatsStore.getState().recordListeningTime(mockStationArabesk, 120);
    const persona = useStatsStore.getState().getPersona();
    expect(persona.title).toBe('Damar & Hüzün Ustası');
    expect(persona.badge).toBe('👑');
  });

  it('awards persona Hit Avcısı & Pop Enerjisi when pop is dominant and time exceeds threshold', () => {
    useStatsStore.getState().recordListeningTime(mockStationPop, 150);
    const persona = useStatsStore.getState().getPersona();
    expect(persona.title).toBe('Hit Avcısı & Pop Enerjisi');
    expect(persona.badge).toBe('⚡');
  });
});
