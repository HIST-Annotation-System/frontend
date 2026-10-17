import {
  boundsFromPoints,
  ShapeType,
  type FormatAdapter,
  type ImageAnnotation,
  type Polygon,
  type Rectangle,
  type Shape,
} from '@annotorious/react';
import type { Annotation, AnnotationDraft, CurvePoint } from '../../../types/annotation';
import type { Offset, Position } from '../../../types/geometry';
import { imageToSlidePosition, slideToImagePosition } from '../../../utils/coordinates';
import { polygonVertices, sameGeometry, toPolygonGeometry } from '../../../utils/geometry';
import { flattenCurve, hasSmoothPoints } from './curve';

/** W3C annotation body purpose used to attach the tissue class to a shape. */
export const CLASSIFYING_PURPOSE = 'classifying';

/** Point of an Annotorious path (`@annotorious/plugin-tools`). */
export interface PolylinePoint {
  type: 'CORNER' | 'CURVE';
  point: [number, number];
  inHandle?: [number, number];
  outHandle?: [number, number];
  locked?: boolean;
}

export interface Polyline extends Shape {
  type: ShapeType.POLYLINE;
  geometry: {
    points: PolylinePoint[];
    closed?: boolean;
    bounds: Shape['geometry']['bounds'];
  };
}

export const getAnnotationClassId = (annotation: ImageAnnotation): string | null =>
  annotation.bodies.find((body) => body.purpose === CLASSIFYING_PURPOSE)?.value ?? null;

export const toAnnotationDraft = ({ id, class_id, geometry, curve }: Annotation): AnnotationDraft => ({
  id,
  class_id,
  geometry,
  curve: curve ?? null,
});

const isPolygon = (shape: Shape): shape is Polygon => shape.type === ShapeType.POLYGON;

const isRectangle = (shape: Shape): shape is Rectangle => shape.type === ShapeType.RECTANGLE;

const isPolyline = (shape: Shape): shape is Polyline => shape.type === ShapeType.POLYLINE;

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

const mapCurvePoint = (point: CurvePoint, map: (position: Position) => Position): CurvePoint =>
  point.type === 'curve'
    ? {
        type: 'curve',
        point: map(point.point),
        in_handle: point.in_handle ? map(point.in_handle) : null,
        out_handle: point.out_handle ? map(point.out_handle) : null,
        locked: Boolean(point.locked),
      }
    : { type: 'corner', point: map(point.point) };

export const toPolylinePoint = (point: CurvePoint): PolylinePoint =>
  point.type === 'curve'
    ? {
        type: 'CURVE',
        point: point.point,
        ...(point.in_handle ? { inHandle: point.in_handle } : {}),
        ...(point.out_handle ? { outHandle: point.out_handle } : {}),
        locked: Boolean(point.locked),
      }
    : { type: 'CORNER', point: point.point };

const fromPolylinePoint = (point: PolylinePoint): CurvePoint =>
  point.type === 'CURVE'
    ? {
        type: 'curve',
        point: [point.point[0], point.point[1]],
        in_handle: point.inHandle ? [point.inHandle[0], point.inHandle[1]] : null,
        out_handle: point.outHandle ? [point.outHandle[0], point.outHandle[1]] : null,
        locked: Boolean(point.locked),
      }
    : { type: 'corner', point: [point.point[0], point.point[1]] };

/** The stored curve, unless the polygon was changed without it (e.g. by an older client). */
const editableCurve = ({ geometry, curve }: AnnotationDraft): CurvePoint[] | null =>
  curve && sameGeometry(toPolygonGeometry(flattenCurve(curve.points)), geometry) ? curve.points : null;

/**
 * Translates between API annotations (GeoJSON polygons, optionally with a curve, in level-0 slide pixels) and
 * Annotorious annotations (shapes in Deep Zoom image pixels); the two spaces differ by the slide's image offset.
 * Every annotation is shown as a closed path, so all shapes share the path editor; a path without smooth
 * points is saved as a plain polygon.
 */
export const createAnnotationAdapter = (offset: Offset): FormatAdapter<ImageAnnotation, AnnotationDraft> => ({
  parse: (draft) => {
    try {
      const slidePoints: CurvePoint[] =
        editableCurve(draft) ??
        polygonVertices(draft.geometry).map((point): CurvePoint => ({ type: 'corner', point }));
      const points = slidePoints.map((point) => mapCurvePoint(point, (position) => slideToImagePosition(position, offset)));
      const selector: Polyline = {
        type: ShapeType.POLYLINE,
        geometry: {
          points: points.map(toPolylinePoint),
          closed: true,
          bounds: boundsFromPoints(flattenCurve(points)),
        },
      };
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
  serialize: (annotation) => {
    const { selector } = annotation.target;
    const base = { id: annotation.id, class_id: getAnnotationClassId(annotation) };
    if (isPolyline(selector)) {
      const points = selector.geometry.points.map((point) =>
        mapCurvePoint(fromPolylinePoint(point), (position) => imageToSlidePosition(position, offset)),
      );
      return {
        ...base,
        geometry: toPolygonGeometry(flattenCurve(points)),
        curve: hasSmoothPoints(points) ? { points } : null,
      };
    }
    return {
      ...base,
      geometry: toPolygonGeometry(shapeVertices(selector).map((position) => imageToSlidePosition(position, offset))),
      curve: null,
    };
  },
});
