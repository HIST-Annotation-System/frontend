import { useQuery } from '@tanstack/react-query';
import { listSlides, slideQueryKeys } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';

/** How often a slide (or the library) is re-checked while one is being uploaded or processed. */
export const SLIDE_POLL_INTERVAL_MS = 3000;
/** Otherwise the library still picks up other admins' changes, just less often. An unchanged list costs a 304
 * without a body (the backend sends an ETag), but the server still builds it, so idle tabs must not ask often. */
const IDLE_LIBRARY_POLL_INTERVAL_MS = 30_000;

/** Not yet in a terminal state (ready/failed) - still being uploaded or processed. */
export const isSlideProcessing = (slide: Pick<Slide, 'status'>): boolean =>
  slide.status === 'uploading' || slide.status === 'processing';

/** The slide library, kept in sync with changes made by other users.
 *
 * Hidden tabs don't poll; coming back to the tab refetches once instead. Refetch-on-focus is off app-wide (so
 * refocusing the annotation editor doesn't clobber an in-progress edit), which is why this query turns it on.
 */
export function useSlides() {
  return useQuery({
    queryKey: slideQueryKeys.list(),
    queryFn: ({ signal }) => listSlides(signal),
    refetchInterval: (query) =>
      query.state.data?.some(isSlideProcessing) ? SLIDE_POLL_INTERVAL_MS : IDLE_LIBRARY_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}
