import {
  boundsFromPoints,
  ShapeType,
  type FormatAdapter,
  type ImageAnnotation,
  type Polygon,
  type Rectangle,
  type Shape,
} from '@annotorious/react';
import type { Annotation, AnnotationDraft } from '../../../types/annotation';
import type { Offset, Position } from '../../../types/geometry';
import { imageToSlidePosition, slideToImagePosition } from '../../../utils/coordinates';
import { polygonVertices, toPolygonGeometry } from '../../../utils/geometry';

/** W3C annotation body purpose used to attach the tissue class to a shape. */
export const CLASSIFYING_PURPOSE = 'classifying';

export const getAnnotationClassId = (annotation: ImageAnnotation): string | null =>
  annotation.bodies.find((body) => body.purpose === CLASSIFYING_PURPOSE)?.value ?? null;

export const toAnnotationDraft = ({ id, class_id, geometry }: Annotation): AnnotationDraft => ({
  id,
  class_id,
  geometry,
});

const isPolygon = (shape: Shape): shape is Polygon => shape.type === ShapeType.POLYGON;

const isRectangle = (shape: Shape): shape is Rectangle => shape.type === ShapeType.RECTANGLE;

const shapeVertices = (shape: Shape): Position[] => {
  if (isPolygon(shape)) return shape.geometry.points.map(([x, y]): Position => [x, y]);
  if (isRectangle(shape)) {
    const { x, y, w, h } = shape.geometry;
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
  }
  throw new Error(`Unsupported shape type: ${shape.type}`);
};

/**
 * Translates between API annotations (GeoJSON polygons in level-0 slide pixels) and Annotorious
 * annotations (shapes in Deep Zoom image pixels); the two spaces differ by the slide's image offset.
 */
export const createAnnotationAdapter = (offset: Offset): FormatAdapter<ImageAnnotation, AnnotationDraft> => ({
  parse: (draft) => {
    try {
      const points = polygonVertices(draft.geometry).map((position) => slideToImagePosition(position, offset));
      const selector: Polygon = { type: ShapeType.POLYGON, geometry: { points, bounds: boundsFromPoints(points) } };
      return {
        parsed: {
          id: draft.id,
          bodies: draft.class_id
            ? [{ id: `${draft.id}-class`, annotation: draft.id, purpose: CLASSIFYING_PURPOSE, value: draft.class_id }]
            : [],
          target: { annotation: draft.id, selector },
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
  serialize: (annotation) => ({
    id: annotation.id,
    class_id: getAnnotationClassId(annotation),
    geometry: toPolygonGeometry(
      shapeVertices(annotation.target.selector).map((position) => imageToSlidePosition(position, offset)),
    ),
  }),
});
