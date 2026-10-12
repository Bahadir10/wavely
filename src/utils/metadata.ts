import { logger } from '@/utils/logger';

export interface NowPlayingTrack {
  title: string;
  artist?: string;
  artwork?: string;
  raw: string;
}

function decodeEntities(str: string): string {
  return str
    .replace(/<br\s*\/?>/gi, ' - ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTrackTitle(raw: string): NowPlayingTrack {
  const cleaned = decodeEntities(raw.replace(/\s+/g, ' ').trim());
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
      raw: cleaned,
    };
  }
  if (cleaned.includes(' / ')) {
    const parts = cleaned.split(' / ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' / ').trim(),
      raw: cleaned,
    };
  }
  return {
    title: cleaned,
    raw: cleaned,
  };
}

/**
 * Universal Radio Song & Artist extractor:
 * 1. Triton Digital NowPlaying API (Süper FM, Virgin Radio TR, Joy Türk, Metro FM, etc.)
 * 2. Shoutcast DNAS /currentsong?sid=1 & /stats?sid=1&json=1 (Arabesk FM, etc.)
 * 3. Icecast status-json.xsl (Alem FM, Slow Türk, Kiss FM Berlin, etc.)
 * 4. Shoutcast legacy 7.html
 */
export async function fetchCurrentTrack(
  streamUrl: string,
  stationName: string = ''
): Promise<NowPlayingTrack | null> {
  if (!streamUrl) return null;

  // 1. Triton Digital NowPlaying Check (Mount-based)
  try {
    let tritonMount: string | null = null;
    const lowerName = (stationName || '').toLowerCase();
    const lowerUrl = streamUrl.toLowerCase();

    if (lowerName.includes('super fm') || lowerUrl.includes('super_fm')) tritonMount = 'SUPER_FM';
    else if (lowerName.includes('virgin radio') || lowerUrl.includes('virgin_radio')) tritonMount = 'VIRGIN_RADIO';
    else if (lowerName.includes('joy türk') || lowerName.includes('joy turk') || lowerUrl.includes('joy_turk')) tritonMount = 'JOY_TURK';
    else if (lowerName.includes('metro fm') || lowerUrl.includes('metro_fm')) tritonMount = 'METRO_FM';
    else if (lowerUrl.includes('streamtheworld.com')) {
      const match = streamUrl.match(/(?:livestream-redirect\/|\/)([A-Za-z0-9_]+)(?:_SC)?(?:\.mp3|\?|$)/i);
      if (match && match[1]) {
        tritonMount = match[1].replace(/_SC$/i, '');
      }
    }

    if (tritonMount) {
      const tritonUrl = `https://np.tritondigital.com/public/nowplaying?mountName=${tritonMount}&numberToFetch=1`;
      const res = await fetch(tritonUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const xml = await res.text();
        const titleMatch = xml.match(/<property name="cue_title"><!\[CDATA\[(.*?)\]\]><\/property>/);
        const artistMatch = xml.match(/<property name="track_artist_name"><!\[CDATA\[(.*?)\]\]><\/property>/);
        const coverMatch = xml.match(/<property name="track_cover_url"><!\[CDATA\[(.*?)\]\]><\/property>/);
        if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 1) {
          const title = decodeEntities(titleMatch[1].trim());
          const artist = artistMatch && artistMatch[1] ? decodeEntities(artistMatch[1].trim()) : undefined;
          return {
            title,
            artist,
            artwork: coverMatch ? coverMatch[1].trim() : undefined,
            raw: artist ? `${artist} - ${title}` : title,
          };
        }
      }
    }
  } catch (err) {
    logger.debug('METADATA', 'Triton probe skipped/failed', err);
  }

  // 2. Shoutcast & Icecast Origin-based Checks
  try {
    const url = new URL(streamUrl);
    const origin = url.origin;

    // 2a. Shoutcast /currentsong?sid=1 (Arabesk FM)
    try {
      const shoutcastSongUrl = `${origin}/currentsong?sid=1`;
      const res = await fetch(shoutcastSongUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const text = (await res.text()).trim();
        if (text && !text.startsWith('<html') && !text.startsWith('<!DOCTYPE') && text.length > 1) {
          return parseTrackTitle(text);
        }
      }
    } catch {}

    // 2b. Shoutcast /stats?sid=1&json=1
    try {
      const shoutcastStatsUrl = `${origin}/stats?sid=1&json=1`;
      const res = await fetch(shoutcastStatsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = (await res.json()) as { songtitle?: string };
        if (json.songtitle && typeof json.songtitle === 'string' && json.songtitle.trim().length > 1) {
          return parseTrackTitle(json.songtitle);
        }
      }
    } catch {}

    // 2c. Icecast /status-json.xsl (Alem FM, Slow Türk, etc.)
    try {
      const icecastUrl = `${origin}/status-json.xsl`;
      const res = await fetch(icecastUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          icestats?: {
            source?:
              | { listenurl?: string; title?: string; yp_currently_playing?: string }
              | { listenurl?: string; title?: string; yp_currently_playing?: string }[];
          };
        };
        const sources = json.icestats?.source;
        const sourceList = Array.isArray(sources) ? sources : sources ? [sources] : [];
        const pathname = url.pathname.replace(/\/+$/, '');
        const match =
          sourceList.find((s) => s.listenurl?.includes(pathname)) ||
          sourceList[0];
        const titleStr = match?.title || match?.yp_currently_playing;
        if (titleStr && typeof titleStr === 'string' && titleStr.trim().length > 1) {
          return parseTrackTitle(titleStr);
        }
      }
    } catch {}

    // 2d. Shoutcast legacy /7.html
    try {
      const shoutcastUrl = `${origin}/7.html`;
      const res = await fetch(shoutcastUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const text = await res.text();
        const parts = text.split(',');
        if (parts.length >= 7) {
          const songTitle = parts.slice(6).join(',').replace(/<\/?[^>]+(>|$)/g, '').trim();
          if (songTitle && songTitle.length > 1) {
            return parseTrackTitle(songTitle);
          }
        }
      }
    } catch {}
  } catch (err) {
    logger.debug('METADATA', 'Track metadata probe error', err);
  }

  return null;
}
