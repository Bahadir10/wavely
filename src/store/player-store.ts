import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';

import type { Station } from '@/api/types';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  current: Station | null;
  status: PlaybackStatus;
  play: (station: Station) => Promise<void>;
  togglePlayback: () => void;
  stop: () => void;
}

// A single player instance lives for the whole app session.
let player: AudioPlayer | null = null;

async function getPlayer(): Promise<AudioPlayer> {
  if (player) return player;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  player = createAudioPlayer(null);
  return player;
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  current: null,
  status: 'idle',

  play: async (station) => {
    if (get().current?.stationuuid === station.stationuuid && get().status === 'playing') return;
    set({ current: station, status: 'loading' });
    try {
      const p = await getPlayer();
      p.replace({ uri: station.url_resolved });
      p.play();
      set({ status: 'playing' });
    } catch {
      set({ status: 'error' });
    }
  },

  togglePlayback: () => {
    const { status, current } = get();
    if (!player || !current) return;
    if (status === 'playing') {
      player.pause();
      set({ status: 'paused' });
    } else {
      // Live streams drift when paused, so reload to jump back to the live edge.
      player.replace({ uri: current.url_resolved });
      player.play();
      set({ status: 'playing' });
    }
  },

  stop: () => {
    player?.pause();
    set({ current: null, status: 'idle' });
  },
}));
