import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';

import type { Station } from '@/api/types';
import { logger } from '@/utils/logger';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  current: Station | null;
  status: PlaybackStatus;
  errorMessage: string | null;
  play: (station: Station) => Promise<void>;
  togglePlayback: () => Promise<void>;
  stop: () => void;
}

let player: AudioPlayer | null = null;

async function getPlayer(): Promise<AudioPlayer> {
  if (player) return player;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    logger.info('AUDIO', 'Audio mode configured successfully');
  } catch (err) {
    logger.warn('AUDIO', 'Failed to configure audio mode (may require dev build)', err);
  }

  try {
    player = createAudioPlayer(null);
    logger.info('AUDIO', 'Audio player created');
    return player;
  } catch (err) {
    logger.error('AUDIO', 'Failed to create audio player', err);
    throw err;
  }
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  current: null,
  status: 'idle',
  errorMessage: null,

  play: async (station) => {
    if (get().current?.stationuuid === station.stationuuid && get().status === 'playing') {
      return;
    }

    logger.info('PLAYER', `Attempting to play station: ${station.name}`, {
      url: station.url_resolved,
      uuid: station.stationuuid,
    });

    set({ current: station, status: 'loading', errorMessage: null });

    try {
      const p = await getPlayer();
      p.replace({ uri: station.url_resolved });
      p.play();
      set({ status: 'playing', errorMessage: null });
      logger.info('PLAYER', `Playback started: ${station.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to play audio stream';
      logger.error('PLAYER', `Playback failed: ${station.name}`, err);
      set({ status: 'error', errorMessage: msg });
    }
  },

  togglePlayback: async () => {
    const { status, current } = get();
    if (!current) return;

    logger.info('PLAYER', `Toggle playback from state: ${status}`);

    try {
      const p = await getPlayer();
      if (status === 'playing') {
        p.pause();
        set({ status: 'paused' });
        logger.info('PLAYER', 'Playback paused');
      } else {
        // Stream re-connect for live broadcast edge
        p.replace({ uri: current.url_resolved });
        p.play();
        set({ status: 'playing', errorMessage: null });
        logger.info('PLAYER', 'Playback resumed');
      }
    } catch (err) {
      logger.error('PLAYER', 'Toggle playback error', err);
      set({ status: 'error', errorMessage: 'Stream toggle error' });
    }
  },

  stop: () => {
    logger.info('PLAYER', 'Playback stopped');
    try {
      player?.pause();
    } catch (err) {
      logger.warn('PLAYER', 'Error pausing player on stop', err);
    }
    set({ current: null, status: 'idle', errorMessage: null });
  },
}));
