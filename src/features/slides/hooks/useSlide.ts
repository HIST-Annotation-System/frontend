import { useQuery } from '@tanstack/react-query';
import { getSlide, slideQueryKeys } from '../../../services/slidesApi';
import { isSlideProcessing, SLIDE_POLL_INTERVAL_MS } from './useSlides';

/** One slide with its metadata; polled only while it is being processed. A ready slide is re-checked when the tab
 * regains focus, which is also when a viewer notices that someone deleted it (see useSlides.ts on focus refetch). */
export function useSlide(slideId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: slideQueryKeys.detail(slideId),
    queryFn: ({ signal }) => getSlide(slideId, signal),
    refetchInterval: (query) =>
      query.state.data && isSlideProcessing(query.state.data) ? SLIDE_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}
