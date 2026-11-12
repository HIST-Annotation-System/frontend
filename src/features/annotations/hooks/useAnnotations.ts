import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  annotationQueryKeys,
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  updateAnnotation,
} from '../../../services/annotationsApi';
import { cellTypeQueryKeys } from '../../../services/cellTypesApi';
import { ApiError } from '../../../services/httpClient';
import type { Annotation, AnnotationCreate, AnnotationOwner, AnnotationUpdate } from '../../../types/annotation';
import type { SegmentationStatus } from '../../../types/hotspot';

export function useAnnotations(owner: AnnotationOwner) {
  return useQuery({
    queryKey: annotationQueryKeys.forOwner(owner),
    queryFn: ({ signal }) => listAnnotations(owner, signal),
  });
}

/**
 * When the model finishes while the hotspot is open, adds its cells to the cache. Only cells not held yet are added,
 * so edits still in progress in the annotator are never overwritten. The model may have brought cell types the list
 * loaded earlier does not have, so that list is refreshed too: a cell of an unknown type would show the wrong name.
 *
 * @returns whether those cells are still on their way.
 */
export function useModelCellsRefresh(owner: AnnotationOwner, status: SegmentationStatus): boolean {
  const queryClient = useQueryClient();
  const [previous, setPrevious] = useState(status);
  const [refreshing, setRefreshing] = useState(false);
  const { type, id } = owner;

  if (status !== previous) {
    setPrevious(status);
    if (previous === 'pending' && status === 'done') setRefreshing(true);
  }

  useEffect(() => {
    if (!refreshing) return;
    const current: AnnotationOwner = { type, id };
    void listAnnotations(current)
      .then((fresh) => {
        void queryClient.invalidateQueries({ queryKey: cellTypeQueryKeys.all });
        queryClient.setQueryData<Annotation[]>(annotationQueryKeys.forOwner(current), (held) => {
          const heldIds = new Set((held ?? []).map((item) => item.id));
          return [...(held ?? []), ...fresh.filter((item) => !heldIds.has(item.id))];
        });
      })
      .catch(() => {
        // The cells are saved; they appear on the next visit.
      })
      .finally(() => setRefreshing(false));
  }, [refreshing, type, id, queryClient]);

  return refreshing;
}

/** Latest flag refresh per owner, so an older response never overwrites a newer one. */
const flagRefreshes = new Map<string, number>();

interface UpdateVariables {
  id: string;
  changes: AnnotationUpdate;
}

interface RemoveVariables {
  id: string;
  /** The cached copy and its place in the list, to put back if the request fails. */
  previous: Annotation | undefined;
  index: number;
}

/** An annotation as it will be once `changes` are saved. */
export function applyAnnotationChanges(annotation: Annotation, changes: AnnotationUpdate): Annotation {
  // Any change, or confirming it as it is, makes a copy of a model cell the author's own work.
  const { confirmed: _confirmed, ...shape } = changes;
  const updated = { ...annotation, ...shape, untouched: false };
  return changes.kind === 'excluded' ? { ...updated, class_id: null } : updated;
}

/** The server's copy in its place in the list, so saving never renumbers or reorders the others. */
function withSaved(current: Annotation[], saved: Annotation): Annotation[] {
  const absorbed = new Set((saved.absorbed_ids ?? []).filter((id) => id !== saved.id));
  const kept = current.filter((item) => !absorbed.has(item.id));
  return kept.some((item) => item.id === saved.id)
    ? kept.map((item) => (item.id === saved.id ? saved : item))
    : [...kept, saved];
}

/**
 * Create/update/delete requests for one slide or hotspot. Results are written straight into the query cache
 * instead of refetching, so edits still in progress in the annotator are never overwritten.
 *
 * Updates and deletes change the cache before the request and are undone if it fails: the screen never waits for the
 * server. All requests of one owner share a scope, so they reach the server one at a time, in the order made.
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

  const scope = { id: annotationQueryKeys.forOwner(owner).join('/') };

  const { mutateAsync: create } = useMutation({
    scope,
    mutationFn: (payload: AnnotationCreate) => createAnnotation(owner, payload),
    onSuccess: (saved) => {
      updateCache((current) => withSaved(current, saved));
      if (saved.kind === 'excluded') void refreshExcludedFlags();
    },
  });
  const { mutateAsync: update } = useMutation({
    scope,
    mutationFn: ({ id, changes }: UpdateVariables) => updateAnnotation(owner, id, changes),
    onMutate: ({ id, changes }) => {
      const previous = getSavedAnnotation(id);
      updateCache((current) =>
        current.map((item) => (item.id === id ? applyAnnotationChanges(item, changes) : item)),
      );
      return { previous };
    },
    onError: (_error, { id }, context) => {
      const previous = context?.previous;
      if (previous) updateCache((current) => current.map((item) => (item.id === id ? previous : item)));
    },
    onSuccess: (saved, { id }, context) => {
      // A newer edit or a delete of it is still queued (this request counts too): what the screen shows is already
      // ahead of this response, which must not undo that edit or bring the deleted annotation back.
      const queued = queryClient.isMutating({
        predicate: (mutation) =>
          mutation.options.scope?.id === scope.id && (mutation.state.variables as { id?: string } | undefined)?.id === id,
      });
      // A merged excluded area may come back under an older area's id, with the edited one among those absorbed.
      if (queued <= 1) updateCache((current) => withSaved(current, saved));
      if (context?.previous?.kind === 'excluded' || saved.kind === 'excluded') void refreshExcludedFlags();
    },
  });
  const { mutateAsync: remove } = useMutation({
    scope,
    mutationFn: async ({ id }: RemoveVariables) => {
      try {
        await deleteAnnotation(owner, id);
      } catch (error) {
        // Already gone is what was asked for (a second click, or a teammate deleted it first).
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    },
    onError: (_error, { previous, index }) => {
      if (!previous) return;
      updateCache((current) => [...current.slice(0, index), previous, ...current.slice(index)]);
    },
    onSuccess: (_result, { previous }) => {
      if (previous?.kind === 'excluded') void refreshExcludedFlags();
    },
  });

  /** Takes the annotation off the list right away (not after a tick), and resolves once the server has deleted it. */
  const removeNow = (id: string) => {
    const current = queryClient.getQueryData<Annotation[]>(annotationQueryKeys.forOwner(owner)) ?? [];
    const index = current.findIndex((item) => item.id === id);
    updateCache((items) => items.filter((item) => item.id !== id));
    return remove({ id, previous: current[index], index });
  };

  return { createAnnotation: create, updateAnnotation: update, deleteAnnotation: removeNow, getSavedAnnotation };
}
