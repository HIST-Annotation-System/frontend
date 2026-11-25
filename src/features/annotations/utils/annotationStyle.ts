import type { AnnotationState, Color, DrawingStyle, ImageAnnotation } from '@annotorious/react';
import type { AnnotationKind } from '../../../types/annotation';
import { getAnnotationClassId, getAnnotationKind } from './annotationAdapter';

export const FALLBACK_ANNOTATION_COLOR: Color = '#a3a3a3';
/** Neutral grey that reads on H&E in both themes (shapes are drawn over the image, not the app background). */
export const EXCLUDED_ANNOTATION_COLOR: Color = '#6b7280';

const isHexColor = (value: string): value is `#${string}` => /^#[0-9a-fA-F]{6}$/.test(value);

/** Thin outlines keep the cells readable; selection thickens them. */
const strokeWidthFor = (state?: AnnotationState): number => (state?.selected ? 3.5 : 1.5);

/** A shape under the pointer lets the tissue show through, so what it covers can be judged without hiding a layer. */
const HOVERED_FILL_OPACITY = 0;
const HOVERED_STROKE_OPACITY = 0.6;
const isSeeThrough = (state?: AnnotationState): boolean => Boolean(state?.hovered) && !state?.selected;

/** Excluded areas: denser grey fill and a heavier outline, so they never pass for a cell. */
const excludedStyle = (state?: AnnotationState): DrawingStyle => ({
  fill: EXCLUDED_ANNOTATION_COLOR,
  fillOpacity: isSeeThrough(state) ? HOVERED_FILL_OPACITY : 0.35,
  stroke: EXCLUDED_ANNOTATION_COLOR,
  strokeOpacity: isSeeThrough(state) ? HOVERED_STROKE_OPACITY : 1,
  strokeWidth: state?.selected ? 4 : 2.5,
});

/** How a shape differs from its class's look: how opaque its layer is, and a colour that singles it out. */
export interface StyleAdjustment {
  /** 0 to 1, of the layer the shape is in. */
  opacity?: number;
  /** Replaces the outline (and fill) colour. */
  color?: string;
}

/**
 * Colours each shape by its tissue class (translucent fill, solid outline, as in the prototype).
 * Shapes that have no class yet - just drawn, not yet saved - use `pendingColor`, or the excluded style
 * when `pendingKind` is `excluded`. `adjust` tells how a saved shape (by id) differs from that look.
 */
export const createAnnotationStyle =
  (
    colorsByClassId: ReadonlyMap<string, string>,
    pendingColor: string,
    pendingKind: AnnotationKind = 'cell',
    adjust?: (annotationId: string) => StyleAdjustment | undefined,
  ) =>
  (annotation: ImageAnnotation, state?: AnnotationState): DrawingStyle => {
    const classId = getAnnotationClassId(annotation);
    const adjustment = adjust?.(annotation.id);
    const opacity = adjustment?.opacity ?? 1;
    const faded = (style: DrawingStyle): DrawingStyle => ({
      ...style,
      fillOpacity: (style.fillOpacity ?? 1) * opacity,
      strokeOpacity: (style.strokeOpacity ?? 1) * opacity,
    });
    if (getAnnotationKind(annotation) === 'excluded' || (!classId && pendingKind === 'excluded')) {
      return faded(excludedStyle(state));
    }
    const value = classId ? colorsByClassId.get(classId) : pendingColor;
    const own = adjustment?.color ?? value;
    const color = own && isHexColor(own) ? own : FALLBACK_ANNOTATION_COLOR;
    return faded({
      fill: color,
      fillOpacity: state?.selected ? 0.4 : isSeeThrough(state) ? HOVERED_FILL_OPACITY : 0.25,
      stroke: color,
      strokeOpacity: isSeeThrough(state) ? HOVERED_STROKE_OPACITY : 1,
      strokeWidth: adjustment?.color ? Math.max(strokeWidthFor(state), 3) : strokeWidthFor(state),
    });
  };
