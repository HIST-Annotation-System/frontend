import type { Annotation, AnnotationClass } from '../../../types/annotation';
import { FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';

interface AnnotationListItemProps {
  annotation: Annotation;
  classes: AnnotationClass[];
  selected: boolean;
  onSelect: (annotationId: string) => void;
}

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AnnotationListItem({ annotation, classes, selected, onSelect }: AnnotationListItemProps) {
  const annotationClass = classes.find((item) => item.id === annotation.class_id);
  const color = annotationClass?.color ?? FALLBACK_ANNOTATION_COLOR;

  return (
    <li>
      <button
        type="button"
        className={`annotation-item${selected ? ' annotation-item--selected' : ''}`}
        aria-pressed={selected}
        title="Pokaż anotację na obrazie"
        onClick={() => onSelect(annotation.id)}
      >
        <span className="annotation-item__swatch" style={{ background: color }} aria-hidden="true" />
        <span className="annotation-item__class">{annotationClass?.name ?? 'Bez typu'}</span>
        <span className="annotation-item__meta">{formatTime(annotation.created_at)}</span>
      </button>
    </li>
  );
}
