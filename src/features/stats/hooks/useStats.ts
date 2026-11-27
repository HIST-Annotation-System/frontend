import { useQuery } from '@tanstack/react-query';
import { getStats, statsQueryKeys } from '../../../services/statsApi';

/** Annotators work while the admin watches: the numbers refresh on their own. */
const STATS_REFRESH_MS = 30_000;

/** `organizationId`: one organization for the system admin; null for everything the user may see. */
export function useStats(organizationId: number | null = null) {
  return useQuery({
    queryKey: statsQueryKeys.scope(organizationId),
    queryFn: ({ signal }) => getStats(organizationId, signal),
    refetchInterval: STATS_REFRESH_MS,
  });
}
