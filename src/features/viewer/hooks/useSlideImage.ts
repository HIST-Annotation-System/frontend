import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../../services/httpClient';
import { getSlideDzi, slideQueryKeys } from '../../../services/slidesApi';

/** The backend's Retry-After for a slide it is still copying to its disk. */
const RETRY_MS = 5000;
/** Bad gateway, unavailable, gateway timeout: the API is restarting (e.g. a deploy) or still copying the slide. */
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const SLIDE_PREPARING_CODE = 'slide_preparing';

export type SlideImageWait = 'copying' | 'server';

export const isRetryable = (error: unknown): boolean =>
  error instanceof ApiError && error.status !== null && RETRYABLE_STATUSES.has(error.status);

/** What the viewer is waiting for after `error`: the slide being copied, the server coming back, or nothing. */
export const waitReason = (error: unknown): SlideImageWait | null => {
  if (!isRetryable(error)) return null;
  return error instanceof ApiError && error.code === SLIDE_PREPARING_CODE ? 'copying' : 'server';
};

/** Whether the slide's tiles can be served yet. The first view of a slide on a server copies it there, which can
 * take minutes for a large one; the check repeats until it is done, and `waiting` says what it waits for. */
export function useSlideImage(slideId: string) {
  const query = useQuery({
    queryKey: [...slideQueryKeys.detail(slideId), 'image'],
    queryFn: ({ signal }) => getSlideDzi(slideId, signal),
    retry: (_failureCount, error) => isRetryable(error),
    retryDelay: RETRY_MS,
    // Once copied, the slide stays on the server while it is in use.
    staleTime: Infinity,
  });
  return { ...query, waiting: query.isPending ? waitReason(query.failureReason) : null };
}
