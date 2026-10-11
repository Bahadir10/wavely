import type { Station, StationQuery } from './types';

// Radio Browser is a free, community-run API. Any mirror works; "all" resolves via DNS round-robin.
const BASE_URL = 'https://all.api.radio-browser.info/json';

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
  const res = await fetch(`${BASE_URL}/stations/search?${buildQuery(params)}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Radio Browser request failed (${res.status})`);
  return sanitizeStations(await res.json());
}

export async function getStationsByIds(ids: string[]): Promise<Station[]> {
  if (ids.length === 0) return [];
  const res = await fetch(`${BASE_URL}/stations/byuuid?uuids=${ids.join(',')}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Radio Browser request failed (${res.status})`);
  return res.json();
}
