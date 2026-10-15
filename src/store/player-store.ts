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
import { useStatsStore } from '@/store/stats-store';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayerState {
  current: Station | null;
  queue: Station[];
  status: PlaybackStatus;
  errorMessage: string | null;
  currentTrack: NowPlayingTrack | null;
  currentCandidateUrl: string | null;
  play: (station: Station, queue?: Station[]) => Promise<void>;
  setQueue: (queue: Station[]) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  retryCurrent: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  stop: () => void;
  refreshTrack: () => Promise<void>;
}

let player: AudioPlayer | null = null;
let metadataTimer: ReturnType<typeof setInterval> | null = null;
let statsTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let activeCandidateIndex = 0;
let currentCandidateUrls: string[] = [];

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
  if (name.includes('fenomen')) {
    candidates.push('https://live.radyofenomen.com/fenomen/256/chunks.m3u8');
    candidates.push('https://live.radyofenomen.com/fenomen/128/icecast.audio');
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

      if (status.playbackState === 'playing' || status.playing) {
        clearWatchdog();
        if (state.status !== 'playing') {
          logger.info('PLAYER', 'Stream playback confirmed active');
          usePlayerStore.setState({ status: 'playing', errorMessage: null });
          startStatsTracking();
        }
      } else if (status.playbackState === 'failed' || status.playbackState === 'error') {
        logger.warn('PLAYER', 'Stream playback error detected on candidate', status);
        switchCandidate(activeCandidateIndex + 1);
      } else if (status.didJustFinish && state.status === 'playing') {
        logger.warn('PLAYER', 'Stream finished or disconnected unexpectedly');
        switchCandidate(activeCandidateIndex + 1);
      } else if (
        status.isLoaded &&
        !status.playing &&
        status.playbackState === 'paused' &&
        state.status === 'playing'
      ) {
        // Genuinely paused externally (headphones unplugged, phone call, or lock screen button)
        logger.info('PLAYER', 'Playback paused externally via lock screen or system');
        stopStatsTracking();
        usePlayerStore.setState({ status: 'paused' });
      } else if (status.playing && state.status === 'paused') {
        // Resumed externally
        logger.info('PLAYER', 'Playback resumed externally via lock screen');
        usePlayerStore.setState({ status: 'playing', errorMessage: null });
        startStatsTracking();
      }
    });

    logger.info('AUDIO', 'Audio player created with event listeners');
    return player;
  } catch (err) {
    logger.error('AUDIO', 'Failed to create audio player', err);
    throw err;
  }
}

function startStatsTracking() {
  if (statsTimer) return;
  statsTimer = setInterval(() => {
    const state = usePlayerStore.getState();
    if (state.status === 'playing' && state.current) {
      useStatsStore.getState().recordListeningTime(state.current, 1);
    }
  }, 1000);
}

function stopStatsTracking() {
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
}

function clearWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

async function switchCandidate(index: number) {
  clearWatchdog();
  const state = usePlayerStore.getState();
  const station = state.current;
  if (!station) return;

  if (index >= currentCandidateUrls.length) {
    logger.warn('PLAYER', 'All stream candidates exhausted or timed out');
    stopStatsTracking();
    usePlayerStore.setState({
      status: 'error',
      errorMessage: 'Ses akışına bağlanılamadı. Yeniden denemek için dokunun.',
    });
    return;
  }

  activeCandidateIndex = index;
  const streamUrl = currentCandidateUrls[index];
  logger.info('PLAYER', `Attempting stream candidate (${index + 1}/${currentCandidateUrls.length}): ${streamUrl}`);
  usePlayerStore.setState({ status: 'loading', currentCandidateUrl: streamUrl });

  try {
    const p = await getPlayer();
    p.replace({ uri: streamUrl });
    p.play();

    // 6.5s Watchdog: if stream doesn't output audio within 6.5s, failover to next candidate automatically
    watchdogTimer = setTimeout(() => {
      const current = usePlayerStore.getState();
      if (current.status === 'loading') {
        logger.warn('PLAYER', `Candidate timed out without audio (>6.5s): ${streamUrl}, trying next candidate...`);
        switchCandidate(activeCandidateIndex + 1);
      }
    }, 6500);

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
        usePlayerStore.setState({ currentTrack: track });
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

    if (metadataTimer) {
      clearInterval(metadataTimer);
    }
    metadataTimer = setInterval(async () => {
      if (usePlayerStore.getState().status === 'playing') {
        const track = await fetchCurrentTrack(streamUrl, usePlayerStore.getState().current?.name || station.name);
        if (track) {
          usePlayerStore.setState({ currentTrack: track });
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
    }, 15000);
  } catch (err) {
    logger.warn('PLAYER', `Candidate threw direct error: ${streamUrl}`, err);
    switchCandidate(activeCandidateIndex + 1);
  }
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  current: null,
  queue: [],
  status: 'idle',
  errorMessage: null,
  currentTrack: null,
  currentCandidateUrl: null,

  play: async (station, queue) => {
    if (get().current?.stationuuid === station.stationuuid && get().status === 'playing') {
      return;
    }

    clearWatchdog();
    stopStatsTracking();
    if (metadataTimer) {
      clearInterval(metadataTimer);
      metadataTimer = null;
    }

    const resolvedQueue = queue ?? (get().queue.length > 0 ? get().queue : [station]);
    currentCandidateUrls = normalizeStreamUrl(station);
    activeCandidateIndex = 0;

    logger.info('PLAYER', `Attempting to play station: ${station.name}`, {
      url: station.url_resolved,
      uuid: station.stationuuid,
      candidatesCount: currentCandidateUrls.length,
    });

    set({
      current: station,
      queue: resolvedQueue,
      status: 'loading',
      errorMessage: null,
      currentTrack: null,
      currentCandidateUrl: currentCandidateUrls[0] || null,
    });

    await switchCandidate(0);
  },

  retryCurrent: async () => {
    const { current, queue } = get();
    if (!current) return;
    logger.info('PLAYER', `Retrying playback for station: ${current.name}`);
    clearWatchdog();
    stopStatsTracking();
    try {
      if (player) {
        player.pause();
      }
    } catch {}
    if (currentCandidateUrls.length > 1) {
      activeCandidateIndex = (activeCandidateIndex + 1) % currentCandidateUrls.length;
    }
    await switchCandidate(activeCandidateIndex);
  },

  togglePlayback: async () => {
    const { status, current } = get();
    if (!current) return;

    logger.info('PLAYER', `Toggle playback from state: ${status}`);

    try {
      const p = await getPlayer();
      if (status === 'playing') {
        p.pause();
        stopStatsTracking();
        clearWatchdog();
        set({ status: 'paused' });
        logger.info('PLAYER', 'Playback paused');
      } else {
        set({ status: 'loading', errorMessage: null });
        p.play();
        watchdogTimer = setTimeout(() => {
          const s = usePlayerStore.getState();
          if (s.status === 'loading') {
            logger.warn('PLAYER', 'Resume watchdog: failed to resume, retrying candidate');
            switchCandidate(activeCandidateIndex);
          }
        }, 6500);
        logger.info('PLAYER', 'Playback resume requested');
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
    clearWatchdog();
    stopStatsTracking();
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
    set({ current: null, status: 'idle', errorMessage: null, currentTrack: null, currentCandidateUrl: null });
  },
}));
