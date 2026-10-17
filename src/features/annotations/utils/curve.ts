import type { CurveGeometry, CurvePoint } from '../../../types/annotation';
import type { Position } from '../../../types/geometry';

/** Must match CURVE_SEGMENT_STEPS in the backend, which derives the stored polygon the same way. */
export const CURVE_SEGMENT_STEPS = 16;

const COORDINATE_EPSILON = 1e-6;
const SMOOTH_HANDLE_RATIO = 1 / 3;

export const hasSmoothPoints = (points: readonly CurvePoint[]): boolean =>
  points.some((point) => point.type === 'curve');

/** Open polygon ring approximating the closed curve (same algorithm as the backend's `flatten_curve`). */
export const flattenCurve = (points: readonly CurvePoint[]): Position[] => {
  const ring: Position[] = [];
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length];
    ring.push(a.point);
    if (a.type !== 'curve' && b.type !== 'curve') return;
    const c1 = a.type === 'curve' && a.out_handle ? a.out_handle : a.point;
    const c2 = b.type === 'curve' && b.in_handle ? b.in_handle : b.point;
    for (let step = 1; step < CURVE_SEGMENT_STEPS; step += 1) {
      const t = step / CURVE_SEGMENT_STEPS;
      const u = 1 - t;
      ring.push([
        u * u * u * a.point[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b.point[0],
        u * u * u * a.point[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b.point[1],
      ]);
    }
  });
  return ring;
};

/**
 * Smooth closed curve through the points (Catmull-Rom style): collinear handles along the direction from the
 * previous to the next point, each a third of the distance to the neighbour on its side.
 */
export const smoothClosedCurve = (points: readonly Position[]): CurvePoint[] =>
  points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy);
    if (length === 0) return { type: 'corner', point };
    const back = Math.hypot(point[0] - previous[0], point[1] - previous[1]) * SMOOTH_HANDLE_RATIO;
    const ahead = Math.hypot(next[0] - point[0], next[1] - point[1]) * SMOOTH_HANDLE_RATIO;
    return {
      type: 'curve',
      point,
      in_handle: [point[0] - (dx / length) * back, point[1] - (dy / length) * back],
      out_handle: [point[0] + (dx / length) * ahead, point[1] + (dy / length) * ahead],
      locked: true,
    };
  });

const samePosition = (a: Position | null | undefined, b: Position | null | undefined): boolean =>
  !a || !b
    ? !a && !b
    : Math.abs(a[0] - b[0]) < COORDINATE_EPSILON && Math.abs(a[1] - b[1]) < COORDINATE_EPSILON;

/** True when both curves match within floating-point noise (handles of corners are ignored). */
export const sameCurve = (a: CurveGeometry | null | undefined, b: CurveGeometry | null | undefined): boolean => {
  if (!a || !b) return !a && !b;
  return (
    a.points.length === b.points.length &&
    a.points.every((point, index) => {
      const other = b.points[index];
      return (
        point.type === other.type &&
        samePosition(point.point, other.point) &&
        (point.type === 'corner' ||
          (samePosition(point.in_handle, other.in_handle) &&
            samePosition(point.out_handle, other.out_handle) &&
            Boolean(point.locked) === Boolean(other.locked)))
      );
    })
  );
};
