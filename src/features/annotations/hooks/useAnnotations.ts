import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  annotationQueryKeys,
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  updateAnnotation,
} from '../../../services/annotationsApi';
import type { Annotation, AnnotationCreate, AnnotationOwner, AnnotationUpdate } from '../../../types/annotation';

export function useAnnotations(owner: AnnotationOwner) {
  return useQuery({
    queryKey: annotationQueryKeys.forOwner(owner),
    queryFn: ({ signal }) => listAnnotations(owner, signal),
  });
}

/** Latest flag refresh per owner, so an older response never overwrites a newer one. */
const flagRefreshes = new Map<string, number>();

interface UpdateVariables {
  id: string;
  changes: AnnotationUpdate;
}

/**
 * Create/update/delete requests for one slide or hotspot. Results are written straight into the query cache
 * instead of refetching, so edits still in progress in the annotator are never overwritten.
 */
export function useAnnotationMutations(owner: AnnotationOwner) {
  const queryClient = useQueryClient();
  const updateCache = (update: (annotations: Annotation[]) => Annotation[]) =>
    queryClient.setQueryData<Annotation[]>(annotationQueryKeys.forOwner(owner), (current) => update(current ?? []));
  /** The server's latest copy of an annotation, as held in the query cache. */
  const getSavedAnnotation = (annotationId: string): Annotation | undefined =>
    queryClient
      .getQueryData<Annotation[]>(annotationQueryKeys.forOwner(owner))
      ?.find((item) => item.id === annotationId);

  /**
   * Excluded areas decide which cells carry a warning: after one changes, only the cells' `inside_excluded` flags are
   * taken from a fresh list, so shapes still being saved are never dropped from the cache.
   */
  const refreshExcludedFlags = async () => {
    const key = annotationQueryKeys.forOwner(owner).join('/');
    const token = (flagRefreshes.get(key) ?? 0) + 1;
    flagRefreshes.set(key, token);
    try {
      const fresh = new Map((await listAnnotations(owner)).map((item) => [item.id, item.inside_excluded]));
      if (flagRefreshes.get(key) !== token) return;
      updateCache((current) =>
        current.map((item) =>
          fresh.has(item.id) && fresh.get(item.id) !== item.inside_excluded
            ? { ...item, inside_excluded: fresh.get(item.id) }
            : item,
        ),
      );
    } catch {
      // Only the warnings are stale; the next change or reload brings them up to date.
    }
  };

  const { mutateAsync: create } = useMutation({
    mutationFn: (payload: AnnotationCreate) => createAnnotation(owner, payload),
    onSuccess: (saved) => {
      const gone = new Set([saved.id, ...(saved.absorbed_ids ?? [])]);
      updateCache((current) => [...current.filter((item) => !gone.has(item.id)), saved]);
      if (saved.kind === 'excluded') void refreshExcludedFlags();
    },
  });
  const { mutateAsync: update } = useMutation({
    mutationFn: ({ id, changes }: UpdateVariables) => updateAnnotation(owner, id, changes),
    onSuccess: (saved) => {
      const wasExcluded = getSavedAnnotation(saved.id)?.kind === 'excluded';
      // A merged excluded area may come back under an older area's id, with the edited one among those absorbed.
      const gone = new Set([saved.id, ...(saved.absorbed_ids ?? [])]);
      updateCache((current) => [...current.filter((item) => !gone.has(item.id)), saved]);
      if (wasExcluded || saved.kind === 'excluded') void refreshExcludedFlags();
    },
  });
  const { mutateAsync: remove } = useMutation({
    mutationFn: (id: string) => deleteAnnotation(owner, id),
    onSuccess: (_result, id) => {
      const wasExcluded = getSavedAnnotation(id)?.kind === 'excluded';
      updateCache((current) => current.filter((item) => item.id !== id));
      if (wasExcluded) void refreshExcludedFlags();
    },
  });

  return { createAnnotation: create, updateAnnotation: update, deleteAnnotation: remove, getSavedAnnotation };
}
