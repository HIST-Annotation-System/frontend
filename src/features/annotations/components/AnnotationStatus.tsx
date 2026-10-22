import { useSelection } from '@annotorious/react';
import type { AnnotationOwner } from '../../../types/annotation';
import { useAnnotations } from '../hooks/useAnnotations';

/** Status bar items: how many outlines there are and which one is selected (its number in the list). */
export default function AnnotationStatus({ owner }: { owner: AnnotationOwner }) {
  const { data: annotations } = useAnnotations(owner);
  const { selected } = useSelection();
  const selectedId = selected[0]?.annotation.id;
  const index = selectedId && annotations ? annotations.findIndex((annotation) => annotation.id === selectedId) : -1;

  return (
    <>
      <span className="viewer-status__item">
        <span className="viewer-status__label">Anotacje</span>
        <span className="viewer-status__value">{annotations ? annotations.length : '—'}</span>
      </span>
      <span className="viewer-status__item">
        <span className="viewer-status__label">Zaznaczony</span>
        <span className="viewer-status__value">{index >= 0 ? `#${index + 1}` : '—'}</span>
      </span>
    </>
  );
}
