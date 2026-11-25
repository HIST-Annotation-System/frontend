import type { PolygonGeometry } from '../types/annotation';
import type { Position } from '../types/geometry';

const samePosition = (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1];

/** Append the first vertex at the end if the ring is not closed yet (GeoJSON rings are closed). */
export const closeRing = (points: Position[]): Position[] =>
  points.length > 0 && !samePosition(points[0], points[points.length - 1]) ? [...points, points[0]] : points;

/** Drop the closing vertex of a GeoJSON ring. */
export const openRing = (ring: Position[]): Position[] =>
  ring.length > 1 && samePosition(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring;

/** Drop vertices that repeat the previous one (e.g. from input events that are handled twice). */
export const removeConsecutiveDuplicates = (points: Position[]): Position[] =>
  points.filter((point, index) => index === 0 || !samePosition(point, points[index - 1]));

export const toPolygonGeometry = (vertices: Position[]): PolygonGeometry => ({
  type: 'Polygon',
  coordinates: [closeRing(openRing(removeConsecutiveDuplicates(vertices)))],
});

const COORDINATE_EPSILON = 1e-6;

/** True when both polygons have the same ring (within floating-point noise). */
export const sameGeometry = (a: PolygonGeometry, b: PolygonGeometry): boolean => {
  const ringA = a.coordinates[0] ?? [];
  const ringB = b.coordinates[0] ?? [];
  return (
    ringA.length === ringB.length &&
    ringA.every(
      ([x, y], index) =>
        Math.abs(x - ringB[index][0]) < COORDINATE_EPSILON && Math.abs(y - ringB[index][1]) < COORDINATE_EPSILON,
    )
  );
};

/** Vertices of a polygon's exterior ring, without the closing point. */
export const polygonVertices = (geometry: PolygonGeometry): Position[] => openRing(geometry.coordinates[0] ?? []);

/** True when the polygon has the 3 distinct vertices the API requires. */
export const hasArea = (geometry: PolygonGeometry): boolean =>
  new Set(polygonVertices(geometry).map(([x, y]) => `${x},${y}`)).size >= 3;
