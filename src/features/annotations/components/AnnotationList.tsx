import { useSelection } from '@annotorious/react';
import { useState } from 'react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { useAnnotationActions } from '../hooks/useAnnotationActions';
import { useAnnotations } from '../hooks/useAnnotations';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import AnnotationListItem from './AnnotationListItem';
import './AnnotationTools.css';

const FIT_PADDING_PX = 80;

const ALL = '';

interface AnnotationListProps {
  owner: AnnotationOwner;
  classes: AnnotationClass[];
  readOnly?: boolean;
  onError: (message: string) => void;
}

export default function AnnotationList({ owner, classes, readOnly = false, onError }: AnnotationListProps) {
  const { data: annotations, isPending, isError, error } = useAnnotations(owner);
  const { changeClass, removeAnnotation } = useAnnotationActions(owner, onError);
  const anno = useSlideAnnotator();
  const selection = useSelection();
  const [filter, setFilter] = useState(ALL);
  const selectedIds = new Set(selection.selected.map(({ annotation }) => annotation.id));

  const showAnnotation = (annotationId: string) => {
    anno?.setSelected(annotationId, !readOnly);
    anno?.fitBounds(annotationId, { padding: FIT_PADDING_PX });
  };

  const numbered = (annotations ?? []).map((annotation, index) => ({ annotation, number: index + 1 }));
  const cells = numbered.filter(({ annotation }) => annotation.kind !== 'excluded');
  const areas = numbered.filter(({ annotation }) => annotation.kind === 'excluded');
  const counts = new Map<string, number>();
  cells.forEach(({ annotation }) => {
    if (annotation.class_id !== null) counts.set(annotation.class_id, (counts.get(annotation.class_id) ?? 0) + 1);
  });
  const activeFilter = filter !== ALL && counts.has(filter) ? filter : ALL;
  const rows = cells.filter(({ annotation }) => activeFilter === ALL || annotation.class_id === activeFilter);

  const renderItems = (items: typeof numbered) =>
    items.map(({ annotation, number }) => (
      <AnnotationListItem
        key={annotation.id}
        annotation={annotation}
        number={number}
        classes={classes}
        selected={selectedIds.has(annotation.id)}
        readOnly={readOnly}
        onSelect={showAnnotation}
        onClassChange={(annotationId, classId) => void changeClass(annotationId, classId)}
        onDelete={(annotationId) => void removeAnnotation(annotationId)}
      />
    ));

  let body;
  if (isPending) body = <Spinner label="Wczytywanie anotacji…" />;
  else if (isError) body = <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać anotacji.')} />;
  else if (annotations.length === 0) body = <p className="annotation-list__empty">Brak anotacji</p>;
  else
    body = (
      <>
        {rows.length > 0 && <ul className="annotation-list">{renderItems(rows)}</ul>}
        {areas.length > 0 && (
          <>
            <h3 className="annotation-list__group">Obszary wyłączone ({areas.length})</h3>
            <ul className="annotation-list">{renderItems(areas)}</ul>
          </>
        )}
      </>
    );

  return (
    <div className="annotation-panel">
      <div className="pane-strip annotation-panel__head">
        <span>
          Anotacje{' '}
          <span className="annotation-panel__count">
            {annotations ? (activeFilter === ALL ? cells.length : `${rows.length} / ${cells.length}`) : ''}
          </span>
        </span>
        {cells.length > 0 && (
          <select
            className="annotation-panel__filter"
            aria-label="Pokaż typ"
            value={activeFilter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value={ALL}>Wszystkie typy</option>
            {classes
              .filter((item) => counts.has(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({counts.get(item.id)})
                </option>
              ))}
          </select>
        )}
      </div>
      <div className="annotation-panel__body">{body}</div>
    </div>
  );
}
