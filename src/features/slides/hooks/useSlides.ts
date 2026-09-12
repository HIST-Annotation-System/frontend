import { useQuery } from '@tanstack/react-query';
import { listSlides, slideQueryKeys } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';

export const SLIDE_POLL_INTERVAL_MS = 3000;

export const isSlideProcessing = (slide: Pick<Slide, 'status'>): boolean => slide.status === 'processing';

/** The slide library; refreshes itself while any slide is still being processed. */
export function useSlides() {
  return useQuery({
    queryKey: slideQueryKeys.list(),
    queryFn: ({ signal }) => listSlides(signal),
    refetchInterval: (query) => (query.state.data?.some(isSlideProcessing) ? SLIDE_POLL_INTERVAL_MS : false),
  });
}
