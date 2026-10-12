import { logger } from '@/utils/logger';

export interface NowPlayingTrack {
  title: string;
  artist?: string;
  raw: string;
}

/**
 * Universal Radio Song & Artist extractor:
 * 1. Checks Icecast status-json.xsl / status.xsl
 * 2. Checks Shoutcast 7.html
 * 3. Inspects in-stream ICY metadata (Icy-MetaData: 1 byte-aligned streamtitle)
 */
export async function fetchCurrentTrack(streamUrl: string): Promise<NowPlayingTrack | null> {
  if (!streamUrl) return null;

  // 1. Try ICY In-Stream Header & Metadata Byte extraction (Works on 90%+ Shoutcast/Icecast stations)
  try {
    const icyTrack = await extractIcyStreamTitle(streamUrl);
    if (icyTrack) return icyTrack;
  } catch (err) {
    logger.debug('METADATA', 'ICY probe skipped/failed', err);
  }

  // 2. Try Icecast status-json.xsl endpoint
  try {
    const url = new URL(streamUrl);
    const origin = url.origin;
    const pathname = url.pathname.replace(/\/+$/, '');

    try {
      const icecastUrl = `${origin}/status-json.xsl`;
      const res = await fetch(icecastUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        const sources = json.icestats?.source;
        const sourceList = Array.isArray(sources) ? sources : sources ? [sources] : [];
        const match = sourceList.find((s: { listenurl?: string }) => s.listenurl?.includes(pathname)) || sourceList[0];
        const titleStr = match?.title || match?.yp_currently_playing;
        if (titleStr && typeof titleStr === 'string' && titleStr.trim().length > 1) {
          return parseTrackTitle(titleStr);
        }
      }
    } catch {
      // Ignore
    }

    // 3. Try Shoutcast 7.html endpoint
    try {
      const shoutcastUrl = `${origin}${pathname}/7.html`;
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
    } catch {
      // Ignore
    }
  } catch (err) {
    logger.debug('METADATA', 'Track metadata probe error', err);
  }

  return null;
}

/**
 * Probes the stream with Icy-MetaData: 1 to extract StreamTitle from the first audio block.
 */
async function extractIcyStreamTitle(streamUrl: string): Promise<NowPlayingTrack | null> {
  try {
    const res = await fetch(streamUrl, {
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      },
      signal: AbortSignal.timeout(4000),
    });

    const metaintHeader = res.headers.get('icy-metaint');
    if (!metaintHeader || !res.body) return null;

    const metaint = parseInt(metaintHeader, 10);
    if (isNaN(metaint) || metaint <= 0) return null;

    const reader = res.body.getReader();
    let bytesRead = 0;
    const chunks: Uint8Array[] = [];

    // Read until we reach the metadata block at `metaint`
    while (bytesRead < metaint + 4096) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      bytesRead += value.length;
    }
    reader.cancel();

    const fullBuffer = new Uint8Array(bytesRead);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    if (fullBuffer.length > metaint) {
      const lenByte = fullBuffer[metaint];
      const metaLength = lenByte * 16;
      if (metaLength > 0 && fullBuffer.length >= metaint + 1 + metaLength) {
        const metaBytes = fullBuffer.slice(metaint + 1, metaint + 1 + metaLength);
        const metaString = new TextDecoder().decode(metaBytes);
        const match = metaString.match(/StreamTitle='([^']*)'/);
        if (match && match[1] && match[1].trim().length > 1) {
          return parseTrackTitle(match[1]);
        }
      }
    }
  } catch {
    // Non-fatal probe failure
  }
  return null;
}

export function parseTrackTitle(raw: string): NowPlayingTrack {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  // Format: "Artist - Title" or "Artist - Song" or "Artist / Song"
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
