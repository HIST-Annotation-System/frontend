import { Origin } from '@annotorious/react';
import { useEffect, useRef } from 'react';
import { useLatest } from '../../../hooks/useLatest';
import { ApiError } from '../../../services/httpClient';
import type { Annotation, AnnotationDraft, AnnotationKind, AnnotationOwner } from '../../../types/annotation';
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
  /** What a newly drawn shape becomes: a cell of the active class, or an excluded area (no class). */
  activeKind: AnnotationKind;
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
export function useAnnotoriousSync({
  owner,
  annotations,
  activeClassId,
  activeKind,
  onError,
}: AnnotoriousSyncOptions): void {
  const anno = useSlideAnnotator();
  const mutations = useAnnotationMutations(owner);
  const latest = useLatest({ mutations, activeClassId, activeKind, onError });
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
    // Last known kind and class per annotation, so a redo restores what the shape was (not the active tool).
    const knownShapes = new Map<string, { kind: AnnotationKind; classId: string | null }>();
    const report = (error: unknown, fallback: string) => latest.current.onError(getErrorMessage(error, fallback));
    // Excluded areas the server merged into another one: they are gone for good, so an undo step that brings one
    // back only puts it on the canvas, and it is taken off again without a request.
    const absorbed = new Set<string>();
    const dropAbsorbed = (id: string) => anno.state.store.deleteAnnotation(id, Origin.REMOTE);
    // The server may store a different outline than drawn (it repairs a self-crossing excluded area and merges
    // overlapping ones): show what it stored, silently (REMOTE: no event, no undo step), so the next edit starts
    // from the saved shape.
    const showStored = (saved: Annotation, draft: AnnotationDraft) => {
      (saved.absorbed_ids ?? []).forEach((id) => {
        absorbed.add(id);
        knownShapes.delete(id);
        dropAbsorbed(id);
      });
      if (
        saved.id === draft.id &&
        sameGeometry(draft.geometry, saved.geometry) &&
        sameCurve(draft.curve, saved.curve ?? null)
      ) {
        return;
      }
      anno.setAnnotations([toAnnotationDraft(saved)], false);
    };

    const handleCreate = (draft: AnnotationDraft) => {
      if (absorbed.has(draft.id)) {
        dropAbsorbed(draft.id);
        return;
      }
      const known = knownShapes.get(draft.id);
      const kind: AnnotationKind =
        draft.kind === 'excluded' ? 'excluded' : draft.class_id ? 'cell' : (known?.kind ?? latest.current.activeKind);
      const classId = kind === 'excluded' ? null : (draft.class_id ?? known?.classId ?? latest.current.activeClassId);
      if ((kind === 'cell' && !classId) || !hasArea(draft.geometry)) {
        anno.removeAnnotation(draft.id);
        return;
      }
      knownShapes.set(draft.id, { kind, classId });
      // Attach the kind and class silently: setAnnotations(..., false) is a REMOTE upsert, so it neither emits an
      // event nor adds an undo step (updateAnnotation would do both and break redo).
      anno.setAnnotations([{ ...draft, kind, class_id: classId }], false);
      enqueue(draft.id, async () => {
        try {
          // The annotator's own UUID becomes the server id, so undo/redo keep referring to the same annotation.
          const saved = await latest.current.mutations.createAnnotation({
            id: draft.id,
            kind,
            class_id: classId,
            geometry: draft.geometry,
            curve: draft.curve,
          });
          showStored(saved, draft);
        } catch (error) {
          anno.removeAnnotation(draft.id);
          report(error, 'Nie udało się zapisać anotacji.');
        }
      });
    };

    const handleUpdate = (draft: AnnotationDraft, previous: AnnotationDraft) => {
      if (absorbed.has(draft.id)) {
        dropAbsorbed(draft.id);
        return;
      }
      if (draft.kind === 'excluded') knownShapes.set(draft.id, { kind: 'excluded', classId: null });
      else if (draft.class_id) knownShapes.set(draft.id, { kind: 'cell', classId: draft.class_id });
      enqueue(draft.id, async () => {
        // Annotorious also reports programmatic updates; only send what differs from the server's copy.
        const saved = latest.current.mutations.getSavedAnnotation(draft.id);
        if (!saved) return;
        // A shape without kind or class (an older undo step) keeps what the server has.
        const toExcluded = draft.kind === 'excluded' && saved.kind !== 'excluded';
        const toCell = draft.kind === 'cell' && draft.class_id !== null && saved.kind === 'excluded';
        const classChanged = draft.kind === 'cell' && draft.class_id !== null && draft.class_id !== saved.class_id;
        const geometryChanged =
          !sameGeometry(draft.geometry, saved.geometry) || !sameCurve(draft.curve, saved.curve ?? null);
        if (!toExcluded && !classChanged && !geometryChanged) return;
        try {
          const stored = await latest.current.mutations.updateAnnotation({
            id: draft.id,
            changes: {
              ...(geometryChanged ? { geometry: draft.geometry, curve: draft.curve } : {}),
              ...(toExcluded ? { kind: 'excluded' as const } : {}),
              ...(classChanged && draft.class_id ? { class_id: draft.class_id } : {}),
              ...(toCell ? { kind: 'cell' as const } : {}),
            },
          });
          showStored(stored, draft);
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
