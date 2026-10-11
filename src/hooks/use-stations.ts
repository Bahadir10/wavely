import { useQuery } from '@tanstack/react-query';

import { searchStations } from '@/api/radio-browser';
import type { StationQuery } from '@/api/types';

export function useStations(params: StationQuery, enabled = true) {
  return useQuery({
    queryKey: ['stations', params],
    queryFn: () => searchStations(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
