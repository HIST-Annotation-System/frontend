import type { AnnotationOwner } from '../../../types/annotation';
import { useAnnotations } from '../hooks/useAnnotations';

/** Status bar item: how many outlines there are. */
export default function AnnotationStatus({ owner }: { owner: AnnotationOwner }) {
  const { data: annotations } = useAnnotations(owner);

  return (
    <span className="viewer-status__item">
      <span className="viewer-status__label">Anotacje</span>
      <span className="viewer-status__value">{annotations ? annotations.length : '—'}</span>
    </span>
  );
}
