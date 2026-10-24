import type { AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { toAnnotationDraft } from '../utils/annotationAdapter';
import { useAnnotationMutations } from './useAnnotations';
import { useSlideAnnotator } from './useSlideAnnotator';

/**
 * Reclassifies or deletes an annotation from outside the annotator (the list, the canvas card): the change goes to
 * the API first, then to the annotator (programmatically).
 */
export function useAnnotationActions(owner: AnnotationOwner, onError: (message: string) => void) {
  const { updateAnnotation, deleteAnnotation } = useAnnotationMutations(owner);
  const anno = useSlideAnnotator();

  const changeClass = async (annotationId: string, classId: string) => {
    try {
      const saved = await updateAnnotation({ id: annotationId, changes: { class_id: classId } });
      anno?.updateAnnotation(toAnnotationDraft(saved));
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się zmienić klasy anotacji.'));
    }
  };

  const removeAnnotation = async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId);
      anno?.removeAnnotation(annotationId);
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się usunąć anotacji.'));
    }
  };

  return { changeClass, removeAnnotation };
}
