import { logger } from '@/utils/logger';
import type { Station, StationQuery } from './types';

// Radio Browser mirrors (fallback capability for resilient networking)
const SERVERS = [
  'https://all.api.radio-browser.info/json',
  'https://de1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
];

const HEADERS = { 'User-Agent': 'Wavely/1.0', Accept: 'application/json' };

export function buildQuery(params: StationQuery): string {
  const search = new URLSearchParams({
    hidebroken: 'true',
    reverse: params.order === 'name' ? 'false' : 'true',
    order: params.order ?? 'clickcount',
    limit: String(params.limit ?? 30),
  });
  if (params.name) search.set('name', params.name);
  if (params.tag) search.set('tag', params.tag);
  if (params.countrycode) search.set('countrycode', params.countrycode);
  return search.toString();
}

/** Drops stations without a playable URL and de-duplicates by name. */
export function sanitizeStations(stations: Station[]): Station[] {
  const seen = new Set<string>();
  return stations.filter((s) => {
    const key = s.name.trim().toLowerCase();
    if (!s.url_resolved || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchStations(params: StationQuery): Promise<Station[]> {
  logger.info('API', 'Searching stations', params);
  const queryString = buildQuery(params);

  for (const server of SERVERS) {
    try {
      const url = `${server}/stations/search?${queryString}`;
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) {
        const data = await res.json();
        const sanitized = sanitizeStations(data);
        logger.info('API', `Found ${sanitized.length} stations from ${server}`);
        return sanitized;
      }
    } catch (err) {
      logger.warn('API', `Server ${server} failed, trying next mirror`, err);
    }
  }

  logger.error('API', 'All Radio Browser mirrors failed to respond');
  throw new Error('All Radio Browser mirrors failed to respond');
}

export async function getStationsByIds(ids: string[]): Promise<Station[]> {
  if (ids.length === 0) return [];
  logger.info('API', `Fetching ${ids.length} stations by ID`);

  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}/stations/byuuid?uuids=${ids.join(',')}`, { headers: HEADERS });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      logger.warn('API', `Server ${server} failed for ID fetch`, err);
    }
  }
  return [];
}
