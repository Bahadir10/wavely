import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';

import type { Station } from '@/api/types';
import { fetchCurrentTrack, type NowPlayingTrack } from '@/utils/metadata';
import { logger } from '@/utils/logger';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  current: Station | null;
  status: PlaybackStatus;
  errorMessage: string | null;
  currentTrack: NowPlayingTrack | null;
  play: (station: Station) => Promise<void>;
  togglePlayback: () => Promise<void>;
  stop: () => void;
  refreshTrack: () => Promise<void>;
}

let player: AudioPlayer | null = null;
let metadataTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Normalizes and resolves robust streaming URLs.
 * Detects known Turkish and global streams and prioritizes verified direct audio endpoints.
 */
function normalizeStreamUrl(station: Station): string[] {
  const name = station.name.toLowerCase();
  const url = station.url_resolved || '';
  const candidates: string[] = [];

  // 1. Arabesk FM fix (Direct audio stream over port 8042)
  if (name.includes('arabesk fm') || url.includes('arabeskfm.biz')) {
    candidates.push('http://yayin.arabeskfm.biz:8042/;stream.mp3');
    candidates.push('http://yayin.arabeskfm.biz:8042/');
  }

  // 2. Alem FM fix (HLS + Direct AAC)
  if (name.includes('alem fm') || name.includes('alemfm')) {
    candidates.push('https://turkmedya.radyotvonline.net/alemfmaac');
    candidates.push('http://turkmedya.radyotvonline.com/turkmedya/alemfm.stream/playlist.m3u8');
    candidates.push('https://edge1.radyotvonline.net/shoutcast/play/alemfm');
  }

  // 3. Kral FM fix
  if (name.includes('kral fm') || url.includes('kralfm')) {
    candidates.push('https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8');
    candidates.push('https://live.radyositesihazir.com/8032/stream');
  }

  // 4. Slow Türk fix
  if (name.includes('slow türk') || name.includes('slow turk')) {
    candidates.push('https://radyo.duhnet.tv/ak_dtvh_slowturk');
  }

  // 5. Süper FM fix
  if (name.includes('süper fm') || name.includes('super fm')) {
    candidates.push('https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC');
  }

  // 6. Virgin Radio fix
  if (name.includes('virgin radio') && (station.countrycode === 'TR' || url.includes('VIRGIN_RADIO_SC'))) {
    candidates.push('http://29073.live.streamtheworld.com:3690/VIRGIN_RADIO_SC');
  } else if (name.includes('virgin radio') && (station.countrycode === 'GB' || name.includes('uk') || url.includes('virginradio.co.uk'))) {
    candidates.push('https://virgin.live.stream.broadcasting.news/stream');
  }

  // Primary API resolved URL
  candidates.push(url);

  // In Shoutcast servers without file extensions, appending /; ensures stream mode
  if (!url.includes('.m3u8') && !url.endsWith('/') && !url.includes('/;')) {
    candidates.push(`${url}/;`);
  }

  if (url.startsWith('http://')) {
    candidates.push(url.replace('http://', 'https://'));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

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
    logger.warn('AUDIO', 'Failed to configure audio mode', err);
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
  currentTrack: null,

  play: async (station) => {
    if (get().current?.stationuuid === station.stationuuid && get().status === 'playing') {
      return;
    }

    if (metadataTimer) {
      clearInterval(metadataTimer);
      metadataTimer = null;
    }

    logger.info('PLAYER', `Attempting to play station: ${station.name}`, {
      url: station.url_resolved,
      uuid: station.stationuuid,
    });

    set({ current: station, status: 'loading', errorMessage: null, currentTrack: null });

    const p = await getPlayer();
    const candidateUrls = normalizeStreamUrl(station);
    let success = false;
    let lastError: unknown = null;

    for (const streamUrl of candidateUrls) {
      try {
        logger.info('PLAYER', `Trying stream candidate: ${streamUrl}`);
        p.replace({ uri: streamUrl });
        p.play();
        set({ status: 'playing', errorMessage: null });
        success = true;
        logger.info('PLAYER', `Playback started successfully with: ${streamUrl}`);

        // Immediate track fetch + periodic polling
        fetchCurrentTrack(streamUrl).then((track) => {
          if (track) {
            set({ currentTrack: track });
            logger.info('METADATA', `Now playing track identified: ${track.title} - ${track.artist || ''}`);
          }
        });

        metadataTimer = setInterval(async () => {
          if (get().status === 'playing') {
            const track = await fetchCurrentTrack(streamUrl);
            if (track) set({ currentTrack: track });
          }
        }, 12000);

        break;
      } catch (err) {
        lastError = err;
        logger.warn('PLAYER', `Candidate ${streamUrl} failed, trying fallback`, err);
      }
    }

    if (!success) {
      const msg = lastError instanceof Error ? lastError.message : 'Stream could not be played';
      logger.error('PLAYER', `All stream candidates failed for: ${station.name}`, lastError);
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
        const candidateUrls = normalizeStreamUrl(current);
        p.replace({ uri: candidateUrls[0] });
        p.play();
        set({ status: 'playing', errorMessage: null });
        logger.info('PLAYER', 'Playback resumed');
      }
    } catch (err) {
      logger.error('PLAYER', 'Toggle playback error', err);
      set({ status: 'error', errorMessage: 'Stream toggle error' });
    }
  },

  refreshTrack: async () => {
    const { current } = get();
    if (!current) return;
    const candidates = normalizeStreamUrl(current);
    const track = await fetchCurrentTrack(candidates[0]);
    if (track) set({ currentTrack: track });
  },

  stop: () => {
    logger.info('PLAYER', 'Playback stopped');
    if (metadataTimer) {
      clearInterval(metadataTimer);
      metadataTimer = null;
    }
    try {
      player?.pause();
    } catch (err) {
      logger.warn('PLAYER', 'Error pausing player on stop', err);
    }
    set({ current: null, status: 'idle', errorMessage: null, currentTrack: null });
  },
}));
