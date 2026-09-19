import { useQuery } from '@tanstack/react-query';
import { listSlides, slideQueryKeys } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';

export const SLIDE_POLL_INTERVAL_MS = 3000;

/** Not yet in a terminal state (ready/failed) - still being uploaded or processed. */
export const isSlideProcessing = (slide: Pick<Slide, 'status'>): boolean =>
  slide.status === 'uploading' || slide.status === 'processing';

/** The slide library; refreshes itself while any slide is still uploading or being processed.
 *
 * `refetchIntervalInBackground` matters here: react-query otherwise skips interval refetches while
 * the tab is unfocused, and this app also turns off refetch-on-focus globally (so refocusing the
 * annotation editor doesn't clobber an in-progress edit) - without it, switching away during a long
 * upload/ingest and coming back would show a stale status until a manual reload.
 */
export function useSlides() {
  return useQuery({
    queryKey: slideQueryKeys.list(),
    queryFn: ({ signal }) => listSlides(signal),
    refetchInterval: (query) => (query.state.data?.some(isSlideProcessing) ? SLIDE_POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: true,
  });
}
