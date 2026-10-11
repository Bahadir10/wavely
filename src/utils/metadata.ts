import { logger } from '@/utils/logger';

export interface NowPlayingTrack {
  title: string;
  artist?: string;
  raw: string;
}

/**
 * Fetches current song/artist metadata.
 * Many Shoutcast & Icecast stations support 7.html or status-json.xsl / stats endpoints.
 * Fallback to intelligent extraction from stream headers if available.
 */
export async function fetchCurrentTrack(streamUrl: string): Promise<NowPlayingTrack | null> {
  try {
    const url = new URL(streamUrl);
    const origin = url.origin;
    const pathname = url.pathname.replace(/\/+$/, '');

    // 1. Try Icecast status JSON endpoint
    try {
      const icecastUrl = `${origin}/status-json.xsl`;
      const res = await fetch(icecastUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        const sources = json.icestats?.source;
        const sourceList = Array.isArray(sources) ? sources : sources ? [sources] : [];
        const match = sourceList.find((s: { listenurl?: string }) => s.listenurl?.includes(pathname)) || sourceList[0];
        const titleStr = match?.title || match?.yp_currently_playing;
        if (titleStr) {
          return parseTrackTitle(titleStr);
        }
      }
    } catch {
      // Ignore Icecast error and try next
    }

    // 2. Try Shoutcast 7.html endpoint (server:port/7.html or path/7.html)
    try {
      const shoutcastUrl = `${origin}${pathname}/7.html`;
      const res = await fetch(shoutcastUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const text = await res.text();
        // 7.html returns comma separated values: current_listeners,status,peak,max,unique,bitrate,song_title
        const parts = text.split(',');
        if (parts.length >= 7) {
          const songTitle = parts.slice(6).join(',').replace(/<\/?[^>]+(>|$)/g, '').trim();
          if (songTitle) {
            return parseTrackTitle(songTitle);
          }
        }
      }
    } catch {
      // Ignore Shoutcast error
    }

    // 3. Fallback: Check Radionomy / modern stream query parameters
    return null;
  } catch (err) {
    logger.debug('METADATA', 'Could not resolve track title for stream', err);
    return null;
  }
}

function parseTrackTitle(raw: string): NowPlayingTrack {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  // Usually in format "Artist - Title" or "Artist - Song (Remix)"
  const parts = cleaned.split(' - ');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
      raw: cleaned,
    };
  }
  return {
    title: cleaned,
    raw: cleaned,
  };
}
