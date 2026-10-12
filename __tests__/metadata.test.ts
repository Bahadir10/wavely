import { parseTrackTitle } from '@/utils/metadata';

describe('metadata parseTrackTitle', () => {
  it('parses "Artist - Title" format', () => {
    const res = parseTrackTitle('Ibrahim Tatlises - Dom Dom Kursunu');
    expect(res.artist).toBe('Ibrahim Tatlises');
    expect(res.title).toBe('Dom Dom Kursunu');
    expect(res.raw).toBe('Ibrahim Tatlises - Dom Dom Kursunu');
  });

  it('parses "Artist / Title" format', () => {
    const res = parseTrackTitle('Tarkan / Simarik');
    expect(res.artist).toBe('Tarkan');
    expect(res.title).toBe('Simarik');
  });

  it('handles single title string without delimiters', () => {
    const res = parseTrackTitle('Alem FM Live');
    expect(res.title).toBe('Alem FM Live');
    expect(res.artist).toBeUndefined();
  });

  it('decodes HTML entities properly', () => {
    const res = parseTrackTitle('Duman &amp; Sebnem Ferah - En Guzel Gunum Gecem');
    expect(res.artist).toBe('Duman & Sebnem Ferah');
    expect(res.title).toBe('En Guzel Gunum Gecem');
  });

  it('strips <br> and HTML tags from raw titles', () => {
    const res = parseTrackTitle('Muslum Gurses<br/>Nilufer');
    expect(res.artist).toBe('Muslum Gurses');
    expect(res.title).toBe('Nilufer');
  });
});
