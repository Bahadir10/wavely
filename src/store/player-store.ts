import Constants, { AppOwnership } from 'expo-constants';
import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { Platform } from 'react-native';
import { create } from 'zustand';

import type { Station } from '@/api/types';
import { logger } from '@/utils/logger';
import { fetchCurrentTrack, type NowPlayingTrack } from '@/utils/metadata';

import { useFavoritesStore } from '@/store/favorites-store';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  current: Station | null;
  queue: Station[];
  status: PlaybackStatus;
  errorMessage: string | null;
  currentTrack: NowPlayingTrack | null;
  play: (station: Station, queue?: Station[]) => Promise<void>;
  setQueue: (queue: Station[]) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  stop: () => void;
  refreshTrack: () => Promise<void>;
}

let player: AudioPlayer | null = null;
let metadataTimer: ReturnType<typeof setInterval> | null = null;

// Lock screen service requires standalone build on Android (not present in Expo Go's prebuilt manifest)
const canUseLockScreen =
  Platform.OS === 'ios' || Constants.appOwnership !== AppOwnership.Expo;

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
    candidates.push('https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_SC');
    candidates.push('http://29073.live.streamtheworld.com:3690/VIRGIN_RADIO_SC');
  } else if (name.includes('virgin radio') && (station.countrycode === 'GB' || name.includes('uk') || url.includes('virginradio.co.uk'))) {
    candidates.push('https://virgin.live.stream.broadcasting.news/stream');
  }

  // 7. Joy Türk & Metro FM & Kral Pop fix
  if (name.includes('joy türk') || name.includes('joy turk')) {
    candidates.push('https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC');
  }
  if (name.includes('metro fm')) {
    candidates.push('https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC');
  }
  if (name.includes('kral pop')) {
    candidates.push('https://dygedge2.radyotvonline.net/kralpop/playlist.m3u8');
  }
  if (name.includes('power türk') || name.includes('power turk')) {
    candidates.push('https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio');
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

  if (canUseLockScreen) {
    try {
      await requestNotificationPermissionsAsync();
    } catch (err) {
      logger.debug('AUDIO', 'Notification permission check skipped', err);
    }
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    logger.info('AUDIO', 'Audio mode configured successfully with background playback');
  } catch (err) {
    logger.warn('AUDIO', 'Failed to configure audio mode', err);
  }

  try {
    player = createAudioPlayer(null, {
      keepAudioSessionActive: true,
      preferredForwardBufferDuration: 10,
      updateInterval: 1000,
    });

    // Handle background status updates, lock screen controls, and stream dropouts
    player.addListener('playbackStatusUpdate', (status) => {
      const state = usePlayerStore.getState();

      // Ignore updates while initial connecting or buffering
      if (
        status.isBuffering ||
        status.playbackState === 'buffering' ||
        status.playbackState === 'loading'
      ) {
        return;
      }

      if (status.playbackState === 'failed' || status.playbackState === 'error') {
        logger.warn('PLAYER', 'Stream playback error or disconnect detected', status);
        usePlayerStore.setState({
          status: 'error',
          errorMessage: 'Stream connection lost',
        });
      } else if (status.didJustFinish && state.status === 'playing') {
        logger.warn('PLAYER', 'Stream finished or disconnected unexpectedly');
        usePlayerStore.setState({
          status: 'paused',
          errorMessage: 'Stream connection lost',
        });
      } else if (
        status.isLoaded &&
        !status.playing &&
        status.playbackState === 'paused' &&
        state.status === 'playing'
      ) {
        // Genuinely paused externally (headphones unplugged, phone call, or lock screen button)
        logger.info('PLAYER', 'Playback paused externally via lock screen or system');
        usePlayerStore.setState({ status: 'paused' });
      } else if (status.playing && state.status === 'paused') {
        // Resumed externally
        logger.info('PLAYER', 'Playback resumed externally via lock screen');
        usePlayerStore.setState({ status: 'playing', errorMessage: null });
      }
    });

    logger.info('AUDIO', 'Audio player created with event listeners');
    return player;
  } catch (err) {
    logger.error('AUDIO', 'Failed to create audio player', err);
    throw err;
  }
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  current: null,
  queue: [],
  status: 'idle',
  errorMessage: null,
  currentTrack: null,

  play: async (station, queue) => {
    if (get().current?.stationuuid === station.stationuuid && get().status === 'playing') {
      return;
    }

    if (metadataTimer) {
      clearInterval(metadataTimer);
      metadataTimer = null;
    }

    const resolvedQueue = queue ?? (get().queue.length > 0 ? get().queue : [station]);

    logger.info('PLAYER', `Attempting to play station: ${station.name}`, {
      url: station.url_resolved,
      uuid: station.stationuuid,
    });

    set({ current: station, queue: resolvedQueue, status: 'loading', errorMessage: null, currentTrack: null });

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

        // Activate Lock Screen Media Controls if supported
        if (canUseLockScreen) {
          try {
            p.setActiveForLockScreen(
              true,
              {
                title: station.name,
                artist: 'Wavely Live Radio',
                albumTitle: station.name,
                artworkUrl: station.favicon,
              },
              {
                isLiveStream: true,
                showSeekForward: false,
                showSeekBackward: false,
              }
            );
          } catch (lockErr) {
            logger.debug('PLAYER', 'Lock screen setup skipped', lockErr);
          }
        }

        // Immediate track fetch + periodic polling
        fetchCurrentTrack(streamUrl, station.name).then((track) => {
          if (track) {
            set({ currentTrack: track });
            logger.info('METADATA', `Now playing track identified: ${track.title} - ${track.artist || ''}`);
            if (canUseLockScreen) {
              try {
                p.updateLockScreenMetadata({
                  title: track.title,
                  artist: track.artist || station.name,
                  albumTitle: station.name,
                  artworkUrl: track.artwork || station.favicon,
                });
              } catch {}
            }
          }
        });

        metadataTimer = setInterval(async () => {
          if (get().status === 'playing') {
            const track = await fetchCurrentTrack(streamUrl, get().current?.name || station.name);
            if (track) {
              set({ currentTrack: track });
              if (canUseLockScreen) {
                try {
                  p.updateLockScreenMetadata({
                    title: track.title,
                    artist: track.artist || station.name,
                    albumTitle: station.name,
                    artworkUrl: track.artwork || station.favicon,
                  });
                } catch {}
              }
            }
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
    const { status, current, currentTrack } = get();
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
        if (canUseLockScreen) {
          try {
            p.setActiveForLockScreen(
              true,
              {
                title: currentTrack?.title || current.name,
                artist: currentTrack?.artist || current.name,
                albumTitle: current.name,
                artworkUrl: currentTrack?.artwork || current.favicon,
              },
              {
                isLiveStream: true,
                showSeekForward: false,
                showSeekBackward: false,
              }
            );
          } catch {}
        }
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
    const track = await fetchCurrentTrack(candidates[0], current.name);
    if (track) {
      set({ currentTrack: track });
      if (canUseLockScreen) {
        try {
          player?.updateLockScreenMetadata({
            title: track.title,
            artist: track.artist || current.name,
            albumTitle: current.name,
            artworkUrl: track.artwork || current.favicon,
          });
        } catch {}
      }
    }
  },

  setQueue: (queue) => set({ queue }),

  playNext: async () => {
    const { current, queue } = get();
    let list = queue;
    if (!list || list.length <= 1) {
      const favs = useFavoritesStore.getState().stations;
      if (favs.length > 1) {
        list = favs;
      }
    }
    if (!list || list.length <= 1) return;
    const currentIndex = list.findIndex((s) => s.stationuuid === current?.stationuuid);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
    await get().play(list[nextIndex], list);
  },

  playPrevious: async () => {
    const { current, queue } = get();
    let list = queue;
    if (!list || list.length <= 1) {
      const favs = useFavoritesStore.getState().stations;
      if (favs.length > 1) {
        list = favs;
      }
    }
    if (!list || list.length <= 1) return;
    const currentIndex = list.findIndex((s) => s.stationuuid === current?.stationuuid);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
    await get().play(list[prevIndex], list);
  },

  stop: () => {
    logger.info('PLAYER', 'Playback stopped');
    if (metadataTimer) {
      clearInterval(metadataTimer);
      metadataTimer = null;
    }
    if (canUseLockScreen) {
      try {
        player?.clearLockScreenControls();
        player?.setActiveForLockScreen(false);
      } catch {}
    }
    try {
      player?.pause();
    } catch (err) {
      logger.warn('PLAYER', 'Error clearing player on stop', err);
    }
    set({ current: null, status: 'idle', errorMessage: null, currentTrack: null });
  },
}));
