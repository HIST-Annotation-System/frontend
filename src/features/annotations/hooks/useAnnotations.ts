import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  annotationQueryKeys,
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  updateAnnotation,
} from '../../../services/annotationsApi';
import type { Annotation, AnnotationCreate, AnnotationUpdate } from '../../../types/annotation';

export function useAnnotations(slideId: string) {
  return useQuery({
    queryKey: annotationQueryKeys.forSlide(slideId),
    queryFn: ({ signal }) => listAnnotations(slideId, signal),
  });
}

interface UpdateVariables {
  id: string;
  changes: AnnotationUpdate;
}

/**
 * Create/update/delete requests for one slide. Results are written straight into the query cache
 * instead of refetching, so edits still in progress in the annotator are never overwritten.
 */
export function useAnnotationMutations(slideId: string) {
  const queryClient = useQueryClient();
  const updateCache = (update: (annotations: Annotation[]) => Annotation[]) =>
    queryClient.setQueryData<Annotation[]>(annotationQueryKeys.forSlide(slideId), (current) => update(current ?? []));
  /** The server's latest copy of an annotation, as held in the query cache. */
  const getSavedAnnotation = (annotationId: string): Annotation | undefined =>
    queryClient
      .getQueryData<Annotation[]>(annotationQueryKeys.forSlide(slideId))
      ?.find((item) => item.id === annotationId);

  const { mutateAsync: create } = useMutation({
    mutationFn: (payload: AnnotationCreate) => createAnnotation(slideId, payload),
    onSuccess: (saved) => updateCache((current) => [...current.filter((item) => item.id !== saved.id), saved]),
  });
  const { mutateAsync: update } = useMutation({
    mutationFn: ({ id, changes }: UpdateVariables) => updateAnnotation(slideId, id, changes),
    onSuccess: (saved) => updateCache((current) => current.map((item) => (item.id === saved.id ? saved : item))),
  });
  const { mutateAsync: remove } = useMutation({
    mutationFn: (id: string) => deleteAnnotation(slideId, id),
    onSuccess: (_result, id) => updateCache((current) => current.filter((item) => item.id !== id)),
  });

  return { createAnnotation: create, updateAnnotation: update, deleteAnnotation: remove, getSavedAnnotation };
}
