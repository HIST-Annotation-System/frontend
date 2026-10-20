import { useSelection } from '@annotorious/react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { useAnnotationMutations, useAnnotations } from '../hooks/useAnnotations';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import { toAnnotationDraft } from '../utils/annotationAdapter';
import AnnotationListItem from './AnnotationListItem';
import './AnnotationTools.css';

const FIT_PADDING_PX = 80;

interface AnnotationListProps {
  owner: AnnotationOwner;
  classes: AnnotationClass[];
  /** Annotations can be shown, but not reclassified or deleted. */
  readOnly?: boolean;
  onError: (message: string) => void;
}

export default function AnnotationList({ owner, classes, readOnly = false, onError }: AnnotationListProps) {
  const { data: annotations, isPending, isError, error } = useAnnotations(owner);
  const { updateAnnotation, deleteAnnotation } = useAnnotationMutations(owner);
  const anno = useSlideAnnotator();
  const selection = useSelection();
  const selectedIds = new Set(selection.selected.map(({ annotation }) => annotation.id));

  const showAnnotation = (annotationId: string) => {
    anno?.setSelected(annotationId, !readOnly);
    anno?.fitBounds(annotationId, { padding: FIT_PADDING_PX });
  };

  // Changes made from the list go to the API first, then to the annotator (programmatically).
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

  if (isPending) return <Spinner label="Wczytywanie anotacji…" />;
  if (isError) return <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać anotacji.')} />;
  if (annotations.length === 0) {
    return (
      <p className="annotation-list__empty">
        Brak anotacji
      </p>
    );
  }

  return (
    <ul className="annotation-list">
      {annotations.map((annotation) => (
        <AnnotationListItem
          key={annotation.id}
          annotation={annotation}
          classes={classes}
          selected={selectedIds.has(annotation.id)}
          readOnly={readOnly}
          onSelect={showAnnotation}
          onClassChange={(annotationId, classId) => void changeClass(annotationId, classId)}
          onDelete={(annotationId) => void removeAnnotation(annotationId)}
        />
      ))}
    </ul>
  );
}
