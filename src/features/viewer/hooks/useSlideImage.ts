import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../../services/httpClient';
import { getSlideDzi, slideQueryKeys } from '../../../services/slidesApi';

/** The backend's Retry-After for a slide it is still copying to its disk. */
const PREPARING_RETRY_MS = 5000;

const isPreparing = (error: unknown): boolean => error instanceof ApiError && error.status === 503;

/** Whether the slide's tiles can be served yet. The first view of a slide on a server copies it there, which can
 * take minutes for a large one: the check repeats until it is done, and `preparing` is true meanwhile. */
export function useSlideImage(slideId: string) {
  const query = useQuery({
    queryKey: [...slideQueryKeys.detail(slideId), 'image'],
    queryFn: ({ signal }) => getSlideDzi(slideId, signal),
    retry: (_failureCount, error) => isPreparing(error),
    retryDelay: PREPARING_RETRY_MS,
    // Once copied, the slide stays on the server while it is open.
    staleTime: Infinity,
  });
  return { ...query, preparing: query.isPending && isPreparing(query.failureReason) };
}
