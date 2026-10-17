import { useEffect, useRef } from 'react';
import { useLatest } from '../../../hooks/useLatest';
import { ApiError } from '../../../services/httpClient';
import type { Annotation, AnnotationDraft, AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { hasArea, sameGeometry } from '../../../utils/geometry';
import { toAnnotationDraft } from '../utils/annotationAdapter';
import { sameCurve } from '../utils/curve';
import { useAnnotationMutations } from './useAnnotations';
import { useSlideAnnotator, type SlideAnnotator } from './useSlideAnnotator';

interface AnnotoriousSyncOptions {
  owner: AnnotationOwner;
  annotations: Annotation[] | undefined;
  activeClassId: string | null;
  onError: (message: string) => void;
}

/**
 * Keeps the annotator and the API in sync. The server is the source of truth: annotations are loaded
 * into the annotator once, then every user edit (draw, reshape, delete, undo/redo) is sent to the API
 * and rolled back in the annotator if the request fails.
 *
 * Note: Annotorious' addAnnotation/setAnnotations are silent, but removeAnnotation/updateAnnotation
 * emit lifecycle events like user edits. Updates are therefore compared with the server's copy (no
 * redundant PATCH), and repeated deletes of an already-deleted annotation (404) are ignored.
 */
export function useAnnotoriousSync({ owner, annotations, activeClassId, onError }: AnnotoriousSyncOptions): void {
  const anno = useSlideAnnotator();
  const mutations = useAnnotationMutations(owner);
  const latest = useLatest({ mutations, activeClassId, onError });
  const loadedInto = useRef<SlideAnnotator | null>(null);

  useEffect(() => {
    if (!anno || !annotations || loadedInto.current === anno) return;
    anno.setAnnotations(annotations.map(toAnnotationDraft), true);
    loadedInto.current = anno;
  }, [anno, annotations]);

  useEffect(() => {
    if (!anno) return undefined;

    // Requests for one annotation run strictly in order (create, updates, delete): each one sees the
    // result of the previous one, so a quick edit never overtakes its POST and repeated events
    // (Annotorious reports some undo steps twice) are compared against an up-to-date server copy.
    const queues = new Map<string, Promise<void>>();
    const enqueue = (id: string, task: () => Promise<void>) => {
      const run = (queues.get(id) ?? Promise.resolve()).then(task);
      queues.set(id, run);
      void run.finally(() => {
        if (queues.get(id) === run) queues.delete(id);
      });
    };
    // Last known class per annotation, so a redo restores the class the shape had (not the active one).
    const knownClasses = new Map<string, string>();
    const report = (error: unknown, fallback: string) => latest.current.onError(getErrorMessage(error, fallback));

    const handleCreate = (draft: AnnotationDraft) => {
      const classId = draft.class_id ?? knownClasses.get(draft.id) ?? latest.current.activeClassId;
      if (!classId || !hasArea(draft.geometry)) {
        anno.removeAnnotation(draft.id);
        return;
      }
      knownClasses.set(draft.id, classId);
      // Attach the class silently: setAnnotations(..., false) is a REMOTE upsert, so it neither emits an
      // event nor adds an undo step (updateAnnotation would do both and break redo).
      anno.setAnnotations([{ ...draft, class_id: classId }], false);
      enqueue(draft.id, async () => {
        try {
          // The annotator's own UUID becomes the server id, so undo/redo keep referring to the same annotation.
          await latest.current.mutations.createAnnotation({
            id: draft.id,
            class_id: classId,
            geometry: draft.geometry,
            curve: draft.curve,
          });
        } catch (error) {
          anno.removeAnnotation(draft.id);
          report(error, 'Nie udało się zapisać anotacji.');
        }
      });
    };

    const handleUpdate = (draft: AnnotationDraft, previous: AnnotationDraft) => {
      if (draft.class_id) knownClasses.set(draft.id, draft.class_id);
      enqueue(draft.id, async () => {
        // Annotorious also reports programmatic updates; only send what differs from the server's copy.
        const saved = latest.current.mutations.getSavedAnnotation(draft.id);
        if (!saved) return;
        const classChanged = draft.class_id !== null && draft.class_id !== saved.class_id;
        const geometryChanged =
          !sameGeometry(draft.geometry, saved.geometry) || !sameCurve(draft.curve, saved.curve ?? null);
        if (!classChanged && !geometryChanged) return;
        try {
          await latest.current.mutations.updateAnnotation({
            id: draft.id,
            changes: {
              ...(geometryChanged ? { geometry: draft.geometry, curve: draft.curve } : {}),
              ...(classChanged && draft.class_id ? { class_id: draft.class_id } : {}),
            },
          });
        } catch (error) {
          anno.updateAnnotation(previous);
          report(error, 'Nie udało się zaktualizować anotacji.');
        }
      });
    };

    const handleDelete = (draft: AnnotationDraft) => {
      enqueue(draft.id, async () => {
        // Nothing to do when the server copy is already gone (e.g. deleted from the sidebar list).
        if (!latest.current.mutations.getSavedAnnotation(draft.id)) return;
        try {
          await latest.current.mutations.deleteAnnotation(draft.id);
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return;
          anno.addAnnotation(draft);
          report(error, 'Nie udało się usunąć anotacji.');
        }
      });
    };

    anno.on('createAnnotation', handleCreate);
    anno.on('updateAnnotation', handleUpdate);
    anno.on('deleteAnnotation', handleDelete);
    return () => {
      anno.off('createAnnotation', handleCreate);
      anno.off('updateAnnotation', handleUpdate);
      anno.off('deleteAnnotation', handleDelete);
    };
  }, [anno, latest]);
}
