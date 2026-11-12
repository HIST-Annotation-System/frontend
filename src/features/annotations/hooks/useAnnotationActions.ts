import type { AnnotationOwner, AnnotationUpdate } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { toAnnotationDraft } from '../utils/annotationAdapter';
import { applyAnnotationChanges, useAnnotationMutations } from './useAnnotations';
import { useSlideAnnotator } from './useSlideAnnotator';

/**
 * Reclassifies (also between cell and excluded area) or deletes an annotation from outside the annotator (the list,
 * the canvas card). The screen changes right away, and goes back if the request fails.
 */
export function useAnnotationActions(owner: AnnotationOwner, onError: (message: string) => void) {
  const { updateAnnotation, deleteAnnotation, getSavedAnnotation } = useAnnotationMutations(owner);
  const anno = useSlideAnnotator();

  const update = async (annotationId: string, changes: AnnotationUpdate, failure: string) => {
    const previous = getSavedAnnotation(annotationId);
    // Silent (a REMOTE upsert): no event, so this does not go through the annotator's own saving as well.
    if (previous) anno?.setAnnotations([toAnnotationDraft(applyAnnotationChanges(previous, changes))], false);
    try {
      const saved = await updateAnnotation({ id: annotationId, changes });
      // The server may have repaired or merged an excluded area. Anything else is on screen already, and writing it
      // again could undo a reshape begun while the request was running.
      if (saved.kind === 'excluded') anno?.updateAnnotation(toAnnotationDraft(saved));
    } catch (requestError) {
      if (previous) anno?.setAnnotations([toAnnotationDraft(previous)], false);
      onError(getErrorMessage(requestError, failure));
    }
  };

  const changeClass = (annotationId: string, classId: string) =>
    update(annotationId, { class_id: classId }, 'Nie udało się zmienić klasy anotacji.');

  const markExcluded = (annotationId: string) =>
    update(annotationId, { kind: 'excluded' }, 'Nie udało się oznaczyć obszaru jako wyłączonego.');

  const markCell = (annotationId: string, classId: string) =>
    update(annotationId, { kind: 'cell', class_id: classId }, 'Nie udało się zmienić obszaru w komórkę.');

  /** The user keeps their copy of a model cell as it is; it moves to their own layer. */
  const confirm = (annotationId: string) =>
    update(annotationId, { confirmed: true }, 'Nie udało się zatwierdzić komórki.');

  const removeAnnotation = async (annotationId: string) => {
    const previous = getSavedAnnotation(annotationId);
    if (!previous) return;
    // In this order: the annotator's delete event then finds nothing left to delete, so only one request goes out.
    const request = deleteAnnotation(annotationId);
    anno?.removeAnnotation(annotationId);
    try {
      await request;
    } catch (requestError) {
      anno?.addAnnotation(toAnnotationDraft(previous));
      onError(getErrorMessage(requestError, 'Nie udało się usunąć anotacji.'));
    }
  };

  return { changeClass, markExcluded, markCell, confirm, removeAnnotation };
}
