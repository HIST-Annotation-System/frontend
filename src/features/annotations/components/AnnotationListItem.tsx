import { Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { Annotation, AnnotationClass } from '../../../types/annotation';
import { formatDateTime } from '../../../utils/format';
import { FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';

interface AnnotationListItemProps {
  annotation: Annotation;
  classes: AnnotationClass[];
  selected: boolean;
  onSelect: (annotationId: string) => void;
  onClassChange: (annotationId: string, classId: string) => void;
  onDelete: (annotationId: string) => void;
}

export default function AnnotationListItem({
  annotation,
  classes,
  selected,
  onSelect,
  onClassChange,
  onDelete,
}: AnnotationListItemProps) {
  const annotationClass = classes.find((item) => item.id === annotation.class_id);
  const color = annotationClass?.color ?? FALLBACK_ANNOTATION_COLOR;

  return (
    <li className={`annotation-item${selected ? ' annotation-item--selected' : ''}`}>
      <button
        type="button"
        className="annotation-item__main"
        title="Pokaż anotację na obrazie"
        onClick={() => onSelect(annotation.id)}
      >
        <span className="annotation-item__swatch" style={{ background: color }} aria-hidden="true" />
        <span className="annotation-item__meta">{formatDateTime(annotation.created_at)}</span>
      </button>
      <select
        className="annotation-item__class"
        aria-label="Klasa tkanki"
        value={annotation.class_id}
        onChange={(event) => onClassChange(annotation.id, event.target.value)}
      >
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        icon={<Trash2 size={14} />}
        title="Usuń anotację"
        aria-label="Usuń anotację"
        onClick={() => onDelete(annotation.id)}
      />
    </li>
  );
}
