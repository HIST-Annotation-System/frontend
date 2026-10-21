import type { AnnotationState, Color, DrawingStyle, ImageAnnotation } from '@annotorious/react';
import { getAnnotationClassId } from './annotationAdapter';
import { FALLBACK_CELL_TYPE_COLOR } from './cellTypeColors';

export const FALLBACK_ANNOTATION_COLOR = FALLBACK_CELL_TYPE_COLOR as Color;

/** The selected shape's outline (as in QuPath): the one colour the class palette never uses. */
const SELECTED_STROKE: Color = '#ffd400';

const isHexColor = (value: string): value is `#${string}` => /^#[0-9a-fA-F]{6}$/.test(value);

/**
 * Colours each shape by its tissue class (translucent fill, solid outline); the selected shape gets a yellow outline.
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
      stroke: state?.selected ? SELECTED_STROKE : color,
      strokeOpacity: 1,
      strokeWidth: state?.selected ? 3 : 2,
    };
  };
