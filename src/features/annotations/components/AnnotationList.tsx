import { useSelection } from '@annotorious/react';
import { useCallback } from 'react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { useLatest } from '../../../hooks/useLatest';
import type { AnnotationClass, AnnotationOwner } from '../../../types/annotation';
import { getErrorMessage } from '../../../utils/errors';
import { useAnnotationActions } from '../hooks/useAnnotationActions';
import { useAnnotations } from '../hooks/useAnnotations';
import { useSlideAnnotator } from '../hooks/useSlideAnnotator';
import AnnotationListItem from './AnnotationListItem';
import './AnnotationTools.css';

const FIT_PADDING_PX = 80;

interface AnnotationListProps {
  owner: AnnotationOwner;
  classes: AnnotationClass[];
  readOnly?: boolean;
  /** Cell types unchecked in the filter: hidden here and on the image. */
  hiddenClassIds: ReadonlySet<string>;
  onToggleClass: (classId: string) => void;
  onShowAllClasses: () => void;
  onError: (message: string) => void;
}

export default function AnnotationList({
  owner,
  classes,
  readOnly = false,
  hiddenClassIds,
  onToggleClass,
  onShowAllClasses,
  onError,
}: AnnotationListProps) {
  const { data: annotations, isPending, isError, error } = useAnnotations(owner);
  const { changeClass, removeAnnotation } = useAnnotationActions(owner, onError);
  const anno = useSlideAnnotator();
  const selection = useSelection();
  const selectedIds = new Set(selection.selected.map(({ annotation }) => annotation.id));

  // Stable, so a change to one annotation re-renders only its own row: a hotspot can hold thousands.
  const latest = useLatest({ anno, readOnly, changeClass, removeAnnotation });
  const showAnnotation = useCallback(
    (annotationId: string) => {
      latest.current.anno?.setSelected(annotationId, !latest.current.readOnly);
      latest.current.anno?.fitBounds(annotationId, { padding: FIT_PADDING_PX });
    },
    [latest],
  );
  const handleClassChange = useCallback(
    (annotationId: string, classId: string) => void latest.current.changeClass(annotationId, classId),
    [latest],
  );
  const handleDelete = useCallback(
    (annotationId: string) => void latest.current.removeAnnotation(annotationId),
    [latest],
  );

  const numbered = (annotations ?? []).map((annotation, index) => ({ annotation, number: index + 1 }));
  const cells = numbered.filter(({ annotation }) => annotation.kind !== 'excluded');
  const areas = numbered.filter(({ annotation }) => annotation.kind === 'excluded');
  const counts = new Map<string, number>();
  cells.forEach(({ annotation }) => {
    if (annotation.class_id !== null) counts.set(annotation.class_id, (counts.get(annotation.class_id) ?? 0) + 1);
  });
  const rows = cells.filter(({ annotation }) => !hiddenClassIds.has(annotation.class_id ?? ''));
  const usedClasses = classes.filter((item) => counts.has(item.id));
  const filtered = usedClasses.some((item) => hiddenClassIds.has(item.id));

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
        onClassChange={handleClassChange}
        onDelete={handleDelete}
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
            {annotations ? (filtered ? `${rows.length} / ${cells.length}` : cells.length) : ''}
          </span>
        </span>
        {filtered && (
          <button type="button" className="annotation-panel__show-all" onClick={onShowAllClasses}>
            Pokaż wszystkie
          </button>
        )}
      </div>
      {usedClasses.length > 0 && (
        <fieldset className="annotation-filter">
          <legend className="visually-hidden">Pokazywane typy komórek</legend>
          {usedClasses.map((item) => (
            <label key={item.id} className="annotation-filter__option" title={item.name}>
              <input
                type="checkbox"
                checked={!hiddenClassIds.has(item.id)}
                onChange={() => onToggleClass(item.id)}
              />
              <span className="annotation-item__swatch" style={{ background: item.color }} aria-hidden="true" />
              <span className="annotation-filter__name">{item.name}</span>
              <span className="annotation-filter__count">{counts.get(item.id)}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="annotation-panel__body">{body}</div>
    </div>
  );
}
