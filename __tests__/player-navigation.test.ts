import type { Station } from '@/api/types';
import { usePlayerStore } from '@/store/player-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    addListener: jest.fn(),
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    updateLockScreenMetadata: jest.fn(),
    clearLockScreenControls: jest.fn(),
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  requestNotificationPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
  AppOwnership: { Expo: 'expo', Standalone: 'standalone' },
}));

const stationA = { stationuuid: 's-1', name: 'Radio One', url_resolved: 'http://test1' } as Station;
const stationB = { stationuuid: 's-2', name: 'Radio Two', url_resolved: 'http://test2' } as Station;
const stationC = { stationuuid: 's-3', name: 'Radio Three', url_resolved: 'http://test3' } as Station;

describe('player queue navigation', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      current: null,
      queue: [],
      status: 'idle',
      errorMessage: null,
      currentTrack: null,
    });
  });

  afterEach(() => {
    usePlayerStore.getState().stop();
  });

  it('cycles to next and previous stations in queue', async () => {
    const queue = [stationA, stationB, stationC];

    // Start with stationA
    await usePlayerStore.getState().play(stationA, queue);
    expect(usePlayerStore.getState().current?.stationuuid).toBe('s-1');
    expect(usePlayerStore.getState().queue.length).toBe(3);

    // Play next -> stationB
    await usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current?.stationuuid).toBe('s-2');

    // Play next -> stationC
    await usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current?.stationuuid).toBe('s-3');

    // Play next -> wraps around to stationA
    await usePlayerStore.getState().playNext();
    expect(usePlayerStore.getState().current?.stationuuid).toBe('s-1');

    // Play previous -> wraps backwards to stationC
    await usePlayerStore.getState().playPrevious();
    expect(usePlayerStore.getState().current?.stationuuid).toBe('s-3');
  });
});
