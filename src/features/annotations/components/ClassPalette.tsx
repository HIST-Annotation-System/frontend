import type { AnnotationClass } from '../../../types/annotation';
import './AnnotationTools.css';

interface ClassPaletteProps {
  classes: AnnotationClass[];
  activeClassId: string | null;
  onSelect: (classId: string) => void;
}

export default function ClassPalette({ classes, activeClassId, onSelect }: ClassPaletteProps) {
  return (
    <div className="class-palette">
      {classes.map((annotationClass) => {
        const active = annotationClass.id === activeClassId;
        return (
          <button
            key={annotationClass.id}
            type="button"
            aria-pressed={active}
            className={`class-palette__item${active ? ' class-palette__item--active' : ''}`}
            // The class colour is data, so it is applied inline; CSS derives borders from currentColor.
            style={{ color: annotationClass.color }}
            onClick={() => onSelect(annotationClass.id)}
          >
            <span className="class-palette__dot" aria-hidden="true" />
            <span className="class-palette__name">{annotationClass.name}</span>
          </button>
        );
      })}
    </div>
  );
}
