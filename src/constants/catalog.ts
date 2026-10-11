export const GENRES = ['pop', 'rock', 'jazz', 'news', 'classical', 'electronic', 'hiphop', 'chillout', 'lounge'];

export const COUNTRIES = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
