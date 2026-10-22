import { useQuery } from '@tanstack/react-query';
import { getSlide, slideQueryKeys } from '../../../services/slidesApi';
import { isSlideProcessing, SLIDE_POLL_INTERVAL_MS } from './useSlides';

/** A ready slide is still re-checked now and then, so a viewer notices when someone deletes it. */
const READY_SLIDE_POLL_INTERVAL_MS = 10000;

/** One slide with its metadata; refreshes itself (often while it is being processed).
 * See useSlides.ts for why `refetchIntervalInBackground` is needed here too. */
export function useSlide(slideId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: slideQueryKeys.detail(slideId),
    queryFn: ({ signal }) => getSlide(slideId, signal),
    refetchInterval: (query) =>
      query.state.data && isSlideProcessing(query.state.data) ? SLIDE_POLL_INTERVAL_MS : READY_SLIDE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    enabled: options?.enabled ?? true,
  });
}
