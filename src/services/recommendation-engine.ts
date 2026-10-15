import type { Station } from '@/api/types';
import type { SavedSong } from '@/store/saved-songs-store';

export interface RecommendationContext {
  listeningGenres: Record<string, number>; // genre -> seconds
  savedSongs: SavedSong[];
  favoriteStationUuids: Set<string>;
  currentHour?: number;
  language?: 'tr' | 'en';
}

export interface RankedStation {
  station: Station;
  score: number;
  reasonBadge: string;
}

export function rankRecommendedStations(
  candidateStations: Station[],
  context: RecommendationContext,
  limit = 10
): RankedStation[] {
  if (!candidateStations || candidateStations.length === 0) {
    return [];
  }

  const hour = context.currentHour ?? new Date().getHours();
  const isNight = hour >= 22 || hour < 6;
  const isMorning = hour >= 6 && hour < 11;
  const lang = context.language || 'tr';

  // Normalize liked song keywords & artists
  const likedKeywords = new Set<string>();
  for (const song of context.savedSongs) {
    if (song.artist) {
      song.artist
        .toLowerCase()
        .split(/[\s,&/-]+/)
        .filter((w) => w.length > 2)
        .forEach((w) => likedKeywords.add(w));
    }
    if (song.stationName) {
      likedKeywords.add(song.stationName.toLowerCase());
    }
  }

  // Find dominant genre from listening history
  let topGenre = '';
  let maxGenreSeconds = 0;
  for (const [genre, seconds] of Object.entries(context.listeningGenres)) {
    if (seconds > maxGenreSeconds) {
      maxGenreSeconds = seconds;
      topGenre = genre;
    }
  }

  const scoredList: RankedStation[] = candidateStations.map((station) => {
    let score = (station.votes || 0) * 0.05; // baseline popularity weight
    let bestReason = lang === 'tr' ? '✨ Popüler Keşif' : '✨ Popular Pick';
    let highestFactorScore = 0;

    const tags = (station.tags || '')
      .toLowerCase()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const stationNameLower = station.name.toLowerCase();

    // 1. Liked Songs & Artist Affinity (Highest Weight)
    let songMatchPoints = 0;
    for (const kw of likedKeywords) {
      if (tags.some((t) => t.includes(kw)) || stationNameLower.includes(kw)) {
        songMatchPoints += 35;
      }
    }
    if (songMatchPoints > 0) {
      score += songMatchPoints;
      if (songMatchPoints > highestFactorScore) {
        highestFactorScore = songMatchPoints;
        bestReason = lang === 'tr' ? '❤️ Sevdiğin Şarkılara Benzer' : '❤️ Based on Liked Songs';
      }
    }

    // 2. Listening Duration Genre Affinity (Logarithmic dampening)
    let genreMatchPoints = 0;
    for (const tag of tags) {
      const listenedSecs = context.listeningGenres[tag] || 0;
      if (listenedSecs > 0) {
        // Logarithmic scale so 1000s doesn't overpower everything
        genreMatchPoints += Math.log2(listenedSecs + 1) * 6;
      }
    }
    if (genreMatchPoints > 0) {
      score += genreMatchPoints;
      if (genreMatchPoints > highestFactorScore) {
        highestFactorScore = genreMatchPoints;
        const matchedTag = tags.find((t) => (context.listeningGenres[t] || 0) > 0) || topGenre;
        bestReason = lang === 'tr' ? `🎯 #${matchedTag} Tercihin` : `🎯 Top Genre: #${matchedTag}`;
      }
    }

    // 3. Time of Day Contextual Boost
    if (isNight) {
      const nightTags = ['slow', 'chill', 'acoustic', 'akustik', 'ambient', 'damar', 'arabesk', 'jazz', 'caz'];
      if (tags.some((t) => nightTags.includes(t))) {
        score += 25;
        if (highestFactorScore < 20) {
          bestReason = lang === 'tr' ? '🌙 Geceye Özel' : '🌙 Night Vibes';
        }
      }
    } else if (isMorning) {
      const morningTags = ['news', 'haber', 'pop', 'morning', 'enerji', 'hit'];
      if (tags.some((t) => morningTags.includes(t))) {
        score += 22;
        if (highestFactorScore < 20) {
          bestReason = lang === 'tr' ? '☀️ Sabah Enerjisi' : '☀️ Morning Energy';
        }
      }
    }

    // 4. Discovery Bias: If already in favorites, slight de-prioritization so user discovers NEW gems
    if (context.favoriteStationUuids.has(station.stationuuid)) {
      score *= 0.65;
    } else {
      score += 10; // New discovery bonus
    }

    return {
      station,
      score,
      reasonBadge: bestReason,
    };
  });

  // Sort descending by score and pick top N
  return scoredList
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
