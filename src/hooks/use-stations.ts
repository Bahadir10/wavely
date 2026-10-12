import { useQuery } from '@tanstack/react-query';

import { searchStations } from '@/api/radio-browser';
import type { StationQuery } from '@/api/types';
import { GLOBAL_FEATURED_STATIONS } from '@/constants/catalog';

export function useStations(params: StationQuery, enabled = true) {
  return useQuery({
    queryKey: ['stations', params],
    queryFn: async () => {
      try {
        const results = await searchStations(params);
        if (results.length > 0) return results;
        // Fallback to globally curated stations if query results empty
        return GLOBAL_FEATURED_STATIONS;
      } catch {
        // Safe graceful degradation: return famous global stations so the user always has music
        return GLOBAL_FEATURED_STATIONS;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
