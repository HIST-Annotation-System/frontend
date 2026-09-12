import type { AnnotationState, Color, DrawingStyle, ImageAnnotation } from '@annotorious/react';
import { getAnnotationClassId } from './annotationAdapter';

export const FALLBACK_ANNOTATION_COLOR: Color = '#94a3b8';

const isHexColor = (value: string): value is `#${string}` => /^#[0-9a-fA-F]{6}$/.test(value);

/**
 * Colours each shape by its tissue class (translucent fill, solid outline, as in the prototype).
 * Shapes that have no class yet - just drawn, not yet saved - use `pendingColor`.
 */
export const createAnnotationStyle =
  (colorsByClassId: ReadonlyMap<string, string>, pendingColor: string) =>
  (annotation: ImageAnnotation, state?: AnnotationState): DrawingStyle => {
    const classId = getAnnotationClassId(annotation);
    const value = classId ? colorsByClassId.get(classId) : pendingColor;
    const color = value && isHexColor(value) ? value : FALLBACK_ANNOTATION_COLOR;
    return {
      fill: color,
      fillOpacity: state?.selected ? 0.4 : 0.25,
      stroke: color,
      strokeOpacity: 1,
      strokeWidth: state?.selected ? 3.5 : 2.5,
    };
  };
