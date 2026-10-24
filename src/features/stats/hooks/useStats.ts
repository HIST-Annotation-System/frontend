import { useQuery } from '@tanstack/react-query';
import { getStats, statsQueryKeys } from '../../../services/statsApi';

/** Annotators work while the admin watches: the numbers refresh on their own. */
const STATS_REFRESH_MS = 30_000;

export function useStats() {
  return useQuery({
    queryKey: statsQueryKeys.all,
    queryFn: ({ signal }) => getStats(signal),
    refetchInterval: STATS_REFRESH_MS,
  });
}
