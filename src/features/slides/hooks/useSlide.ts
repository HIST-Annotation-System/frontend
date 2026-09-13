import { useQuery } from '@tanstack/react-query';
import { getSlide, slideQueryKeys } from '../../../services/slidesApi';
import { isSlideProcessing, SLIDE_POLL_INTERVAL_MS } from './useSlides';

/** One slide with its metadata; refreshes itself while the slide is being processed.
 * See useSlides.ts for why `refetchIntervalInBackground` is needed here too. */
export function useSlide(slideId: string) {
  return useQuery({
    queryKey: slideQueryKeys.detail(slideId),
    queryFn: ({ signal }) => getSlide(slideId, signal),
    refetchInterval: (query) =>
      query.state.data && isSlideProcessing(query.state.data) ? SLIDE_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
  });
}
