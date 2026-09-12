import { useQuery } from '@tanstack/react-query';
import { annotationClassQueryKeys, listAnnotationClasses } from '../../../services/annotationClassesApi';

/** Tissue classes used to label annotations (seeded reference data, fetched once). */
export function useAnnotationClasses() {
  return useQuery({
    queryKey: annotationClassQueryKeys.all,
    queryFn: ({ signal }) => listAnnotationClasses(signal),
    staleTime: Infinity,
  });
}
