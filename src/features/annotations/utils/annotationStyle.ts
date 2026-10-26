import type { AnnotationState, Color, DrawingStyle, ImageAnnotation } from '@annotorious/react';
import type { AnnotationKind } from '../../../types/annotation';
import { getAnnotationClassId, getAnnotationKind } from './annotationAdapter';

export const FALLBACK_ANNOTATION_COLOR: Color = '#a3a3a3';
/** Neutral grey that reads on H&E in both themes (shapes are drawn over the image, not the app background). */
export const EXCLUDED_ANNOTATION_COLOR: Color = '#6b7280';

const isHexColor = (value: string): value is `#${string}` => /^#[0-9a-fA-F]{6}$/.test(value);

/** Thin outlines keep the cells readable; hover and selection thicken them. */
const strokeWidthFor = (state?: AnnotationState): number => {
  if (state?.selected) return 3.5;
  if (state?.hovered) return 3;
  return 1.5;
};

/** Excluded areas: denser grey fill and a heavier outline, so they never pass for a cell. */
const excludedStyle = (state?: AnnotationState): DrawingStyle => ({
  fill: EXCLUDED_ANNOTATION_COLOR,
  fillOpacity: 0.35,
  stroke: EXCLUDED_ANNOTATION_COLOR,
  strokeOpacity: 1,
  strokeWidth: state?.selected ? 4 : state?.hovered ? 3.25 : 2.5,
});

/**
 * Colours each shape by its tissue class (translucent fill, solid outline, as in the prototype).
 * Shapes that have no class yet - just drawn, not yet saved - use `pendingColor`, or the excluded style
 * when `pendingKind` is `excluded`.
 */
export const createAnnotationStyle =
  (colorsByClassId: ReadonlyMap<string, string>, pendingColor: string, pendingKind: AnnotationKind = 'cell') =>
  (annotation: ImageAnnotation, state?: AnnotationState): DrawingStyle => {
    const classId = getAnnotationClassId(annotation);
    if (getAnnotationKind(annotation) === 'excluded' || (!classId && pendingKind === 'excluded')) {
      return excludedStyle(state);
    }
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
