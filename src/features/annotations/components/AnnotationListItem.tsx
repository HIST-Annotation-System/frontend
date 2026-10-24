import { Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { Annotation, AnnotationClass } from '../../../types/annotation';
import { formatDateTime } from '../../../utils/format';
import { FALLBACK_ANNOTATION_COLOR } from '../utils/annotationStyle';

interface AnnotationListItemProps {
  annotation: Annotation;
  /** Position in the full list, shown as "#n" (also in the status bar). */
  number: number;
  classes: AnnotationClass[];
  selected: boolean;
  readOnly: boolean;
  onSelect: (annotationId: string) => void;
  onClassChange: (annotationId: string, classId: string) => void;
  onDelete: (annotationId: string) => void;
}

export default function AnnotationListItem({
  annotation,
  number,
  classes,
  selected,
  readOnly,
  onSelect,
  onClassChange,
  onDelete,
}: AnnotationListItemProps) {
  const annotationClass = classes.find((item) => item.id === annotation.class_id);
  const color = annotationClass?.color ?? FALLBACK_ANNOTATION_COLOR;
  // The ring is closed: its last vertex repeats the first.
  const points = Math.max(0, (annotation.geometry.coordinates[0]?.length ?? 1) - 1);

  return (
    <li className={`annotation-item${selected ? ' annotation-item--selected' : ''}`}>
      <button
        type="button"
        className="annotation-item__main"
        title={`Pokaż anotację na obrazie · dodano ${formatDateTime(annotation.created_at)}`}
        onClick={() => onSelect(annotation.id)}
      >
        <span className="annotation-item__swatch" style={{ background: color }} aria-hidden="true" />
        <span className="annotation-item__number">#{number}</span>
      </button>
      <select
        className="annotation-item__class"
        aria-label="Klasa tkanki"
        value={annotation.class_id}
        disabled={readOnly}
        onChange={(event) => onClassChange(annotation.id, event.target.value)}
      >
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <span className="annotation-item__points">{points} pkt</span>
      {!readOnly && (
        <Button
          variant="ghost"
          className="btn--danger-icon"
          icon={<Trash2 size={14} />}
          title="Usuń obrys"
          aria-label="Usuń anotację"
          onClick={() => onDelete(annotation.id)}
        />
      )}
    </li>
  );
}
