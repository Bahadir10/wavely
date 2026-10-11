import { buildQuery, sanitizeStations } from '@/api/radio-browser';
import type { Station } from '@/api/types';

const station = (overrides: Partial<Station>): Station => ({
  stationuuid: 'id',
  name: 'Station',
  url_resolved: 'https://stream.example.com',
  favicon: '',
  tags: '',
  country: '',
  countrycode: '',
  language: '',
  codec: 'MP3',
  bitrate: 128,
  votes: 0,
  clickcount: 0,
  ...overrides,
});

describe('buildQuery', () => {
  it('applies defaults', () => {
    const q = new URLSearchParams(buildQuery({}));
    expect(q.get('order')).toBe('clickcount');
    expect(q.get('reverse')).toBe('true');
    expect(q.get('limit')).toBe('30');
    expect(q.get('hidebroken')).toBe('true');
  });

  it('includes only provided filters', () => {
    const q = new URLSearchParams(buildQuery({ tag: 'jazz', countrycode: 'TR' }));
    expect(q.get('tag')).toBe('jazz');
    expect(q.get('countrycode')).toBe('TR');
    expect(q.has('name')).toBe(false);
  });
});

describe('sanitizeStations', () => {
  it('removes stations without a stream URL and duplicate names', () => {
    const result = sanitizeStations([
      station({ stationuuid: '1', name: 'Jazz FM' }),
      station({ stationuuid: '2', name: ' jazz fm ' }),
      station({ stationuuid: '3', name: 'Rock', url_resolved: '' }),
      station({ stationuuid: '4', name: 'News' }),
    ]);
    expect(result.map((s) => s.stationuuid)).toEqual(['1', '4']);
  });
});
