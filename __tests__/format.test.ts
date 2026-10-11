import { formatTags, greeting } from '@/utils/format';

describe('formatTags', () => {
  it('capitalizes, trims and limits tags', () => {
    expect(formatTags('pop, rock ,jazz,news', 2)).toBe('Pop, Rock');
  });

  it('returns empty string for empty input', () => {
    expect(formatTags('')).toBe('');
  });
});

describe('greeting', () => {
  it.each([
    [8, 'Good morning'],
    [14, 'Good afternoon'],
    [20, 'Good evening'],
    [2, 'Good night'],
  ])('at %i:00 returns "%s"', (hour, expected) => {
    expect(greeting(new Date(2026, 0, 1, hour))).toBe(expected);
  });
});
