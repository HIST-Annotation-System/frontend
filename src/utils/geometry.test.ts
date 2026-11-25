import { describe, expect, it } from 'vitest';
import type { Position } from '../types/geometry';
import {
  closeRing,
  openRing,
  polygonVertices,
  removeConsecutiveDuplicates,
  sameGeometry,
  toPolygonGeometry,
} from './geometry';

const triangle: Position[] = [
  [0, 0],
  [10, 0],
  [5, 8],
];

describe('geometry', () => {
  it('closes and opens rings', () => {
    expect(closeRing(triangle)).toEqual([...triangle, [0, 0]]);
    expect(closeRing(closeRing(triangle))).toEqual([...triangle, [0, 0]]);
    expect(openRing(closeRing(triangle))).toEqual(triangle);
    expect(openRing(triangle)).toEqual(triangle);
  });

  it('builds GeoJSON polygons and reads their vertices back', () => {
    const geometry = toPolygonGeometry(triangle);
    expect(geometry).toEqual({ type: 'Polygon', coordinates: [[...triangle, [0, 0]]] });
    expect(polygonVertices(geometry)).toEqual(triangle);
  });

  it('compares polygons within floating-point noise', () => {
    const shifted: Position[] = triangle.map(([x, y]) => [x + 1e-9, y]);
    expect(sameGeometry(toPolygonGeometry(triangle), toPolygonGeometry(shifted))).toBe(true);
    expect(sameGeometry(toPolygonGeometry(triangle), toPolygonGeometry([...triangle, [3, 3]]))).toBe(false);
    expect(sameGeometry(toPolygonGeometry(triangle), toPolygonGeometry([[0, 0], [10, 0], [5, 9]]))).toBe(false);
  });

  it('drops repeated vertices (the annotator can report each click twice)', () => {
    const doubled: Position[] = [
      [0, 0],
      [0, 0],
      [10, 0],
      [10, 0],
      [5, 8],
      [5, 8],
    ];
    expect(removeConsecutiveDuplicates(doubled)).toEqual(triangle);
    expect(toPolygonGeometry(doubled)).toEqual(toPolygonGeometry(triangle));
    expect(toPolygonGeometry([...triangle, [0, 0]])).toEqual(toPolygonGeometry(triangle));
  });
});
