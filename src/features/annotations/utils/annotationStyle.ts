import type { AnnotationState, Color, DrawingStyle, ImageAnnotation } from '@annotorious/react';
import { getAnnotationClassId } from './annotationAdapter';

export const FALLBACK_ANNOTATION_COLOR: Color = '#a3a3a3';

const isHexColor = (value: string): value is `#${string}` => /^#[0-9a-fA-F]{6}$/.test(value);

/** Thin outlines keep the cells readable; hover and selection thicken them. */
const strokeWidthFor = (state?: AnnotationState): number => {
  if (state?.selected) return 3.5;
  if (state?.hovered) return 3;
  return 1.5;
};

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
      strokeWidth: strokeWidthFor(state),
    };
  };
