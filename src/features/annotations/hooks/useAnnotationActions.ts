import type { AnnotationOwner, AnnotationUpdate } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { toAnnotationDraft } from '../utils/annotationAdapter';
import { useAnnotationMutations } from './useAnnotations';
import { useSlideAnnotator } from './useSlideAnnotator';

/**
 * Reclassifies (also between cell and excluded area) or deletes an annotation from outside the annotator (the list, the canvas card): the change goes to
 * the API first, then to the annotator (programmatically).
 */
export function useAnnotationActions(owner: AnnotationOwner, onError: (message: string) => void) {
  const { updateAnnotation, deleteAnnotation } = useAnnotationMutations(owner);
  const anno = useSlideAnnotator();

  const update = async (annotationId: string, changes: AnnotationUpdate, failure: string) => {
    try {
      const saved = await updateAnnotation({ id: annotationId, changes });
      anno?.updateAnnotation(toAnnotationDraft(saved));
    } catch (requestError) {
      onError(getErrorMessage(requestError, failure));
    }
  };

  const changeClass = (annotationId: string, classId: string) =>
    update(annotationId, { class_id: classId }, 'Nie udało się zmienić klasy anotacji.');

  const markExcluded = (annotationId: string) =>
    update(annotationId, { kind: 'excluded' }, 'Nie udało się oznaczyć obszaru jako wyłączonego.');

  const markCell = (annotationId: string, classId: string) =>
    update(annotationId, { kind: 'cell', class_id: classId }, 'Nie udało się zmienić obszaru w komórkę.');

  const removeAnnotation = async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId);
      anno?.removeAnnotation(annotationId);
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się usunąć anotacji.'));
    }
  };

  return { changeClass, markExcluded, markCell, removeAnnotation };
}
