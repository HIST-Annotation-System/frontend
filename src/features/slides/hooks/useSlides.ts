import { useQuery } from '@tanstack/react-query';
import { listSlides, slideQueryKeys } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';

/** How often the library re-checks the list while the tab is visible / hidden. Several admins work on
 * the same slides, so it always polls - not only while one of this user's slides is processing. An
 * unchanged list costs a 304 without a body (the backend sends an ETag, the browser revalidates). */
export const SLIDE_POLL_INTERVAL_MS = 3000;
export const SLIDE_POLL_HIDDEN_INTERVAL_MS = 15000;

/** Not yet in a terminal state (ready/failed) - still being uploaded or processed. */
export const isSlideProcessing = (slide: Pick<Slide, 'status'>): boolean =>
  slide.status === 'uploading' || slide.status === 'processing';

export const slidePollInterval = (visibility: DocumentVisibilityState = document.visibilityState): number =>
  visibility === 'hidden' ? SLIDE_POLL_HIDDEN_INTERVAL_MS : SLIDE_POLL_INTERVAL_MS;

/** The slide library, kept in sync with changes made by other users.
 *
 * `refetchIntervalInBackground` matters here: react-query otherwise skips interval refetches while
 * the tab is unfocused, and this app also turns off refetch-on-focus globally (so refocusing the
 * annotation editor doesn't clobber an in-progress edit) - without it, switching away and coming back
 * would show a stale list until the next interval.
 */
export function useSlides() {
  return useQuery({
    queryKey: slideQueryKeys.list(),
    queryFn: ({ signal }) => listSlides(signal),
    refetchInterval: () => slidePollInterval(),
    refetchIntervalInBackground: true,
  });
}
