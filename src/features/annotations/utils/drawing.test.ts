import { describe, expect, it } from 'vitest';
import type { CurvePoint } from '../../../types/annotation';
import type { Position } from '../../../types/geometry';
import { CURVE_SEGMENT_STEPS, flattenCurve, hasSmoothPoints, sameCurve, smoothClosedCurve } from './curve';
import { isFarEnough, ringArea, simplifyStroke, smoothStroke, strokeToOutline, trimOvershoot } from './freehand';

const circle = (count: number, radius = 50, cx = 100, cy = 100): Position[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index) / count;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });

describe('freehand strokes', () => {
  it('smooths the inside of a stroke and keeps its ends', () => {
    const zigzag: Position[] = [[0, 0], [1, 10], [2, 0], [3, 10], [4, 0]];
    const smoothed = smoothStroke(zigzag, 1);
    expect(smoothed[0]).toEqual([0, 0]);
    expect(smoothed[4]).toEqual([4, 0]);
    expect(smoothed[2][1]).toBeCloseTo(20 / 3);
    expect(smoothStroke([], 2)).toEqual([]);
  });

  it('drops points within the tolerance of a straight line', () => {
    const line: Position[] = [[0, 0], [1, 0.1], [2, -0.1], [3, 0], [4, 5], [5, 0]];
    expect(simplifyStroke(line, 0.5)).toEqual([[0, 0], [3, 0], [4, 5], [5, 0]]);
    expect(simplifyStroke([[0, 0], [1, 1]], 1)).toEqual([[0, 0], [1, 1]]);
  });

  it('measures the area of a ring either way round', () => {
    const square: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(ringArea(square)).toBe(100);
    expect(ringArea([...square].reverse())).toBe(100);
    expect(ringArea([[0, 0], [1, 1]])).toBe(0);
  });

  it('cuts off a stroke that overshoots its start', () => {
    // A square drawn past its first corner: the closing segment crosses the first one.
    const stroke: Position[] = [[0, 5], [20, 5], [20, 20], [5, 20], [5, -5]];
    const trimmed = trimOvershoot(stroke);
    expect(trimmed[0]).toEqual([5, 5]);
    expect(trimmed.length).toBe(4);
    expect(ringArea(trimmed)).toBe(225);
  });

  it('keeps a stroke without overshoot as it is', () => {
    const square: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(trimOvershoot(square)).toEqual(square);
  });

  it('samples by screen distance, so zooming in records more points', () => {
    expect(isFarEnough([0, 0], [1, 0], 1)).toBe(false);
    expect(isFarEnough([0, 0], [1, 0], 4)).toBe(true);
  });

  it('turns a drawn circle into a closed outline of similar area', () => {
    const outline = strokeToOutline(circle(200), 1);
    expect(outline).not.toBeNull();
    expect(outline!.length).toBeGreaterThanOrEqual(3);
    expect(outline!.length).toBeLessThan(200);
    expect(ringArea(outline!)).toBeGreaterThan(Math.PI * 50 * 50 * 0.9);
  });

  it('rejects clicks and tiny scribbles', () => {
    expect(strokeToOutline([[0, 0], [1, 1]], 1)).toBeNull();
    expect(strokeToOutline(circle(30, 1), 1)).toBeNull();
    // The same circle is big enough once the user is zoomed in on it.
    expect(strokeToOutline(circle(30, 1), 10)).not.toBeNull();
  });

  it('caps the number of outline points', () => {
    const wobbly = circle(5000, 2000).map(([x, y], index): Position => [x + (index % 2) * 3, y]);
    expect(strokeToOutline(wobbly, 1)!.length).toBeLessThanOrEqual(600);
  });
});

describe('curves', () => {
  const corner = (x: number, y: number): CurvePoint => ({ type: 'corner', point: [x, y] });
  const triangle: CurvePoint[] = [
    { type: 'curve', point: [10, 10], in_handle: [0, 20], out_handle: [20, 0] },
    corner(40, 10),
    corner(25, 40),
  ];

  it('knows whether any point is smooth', () => {
    expect(hasSmoothPoints(triangle)).toBe(true);
    expect(hasSmoothPoints([corner(0, 0), corner(1, 0), corner(0, 1)])).toBe(false);
  });

  it('flattens corners to themselves', () => {
    expect(flattenCurve([corner(0, 0), corner(1, 0), corner(0, 1)])).toEqual([[0, 0], [1, 0], [0, 1]]);
  });

  it('flattens exactly like the backend', () => {
    // Reference values from backend app.services.annotations.flatten_curve on the same curve.
    const ring = flattenCurve(triangle);
    expect(ring).toHaveLength(3 + 2 * (CURVE_SEGMENT_STEPS - 1));
    const expected: [number, Position][] = [
      [1, [11.984863, 8.352051]],
      [8, [28.75, 6.25]],
      [16, [40, 10]],
      [20, [22.758789, 38.088379]],
    ];
    for (const [index, [x, y]] of expected) {
      expect(ring[index][0]).toBeCloseTo(x, 5);
      expect(ring[index][1]).toBeCloseTo(y, 5);
    }
  });

  it('gives smooth points collinear handles a third of the way to each neighbour', () => {
    const [first] = smoothClosedCurve([[0, 0], [30, 0], [30, 30], [0, 30]]);
    expect(first.type).toBe('curve');
    expect(first.locked).toBe(true);
    // Direction from the previous point (0,30) to the next (30,0).
    const [ix, iy] = first.in_handle!;
    const [ox, oy] = first.out_handle!;
    expect(Math.hypot(ix, iy)).toBeCloseTo(10);
    expect(Math.hypot(ox, oy)).toBeCloseTo(10);
    expect(ix * oy - iy * ox).toBeCloseTo(0); // collinear with the point at the origin
  });

  it('keeps a point whose neighbours coincide as a corner', () => {
    expect(smoothClosedCurve([[0, 0], [5, 5]])[0].type).toBe('corner');
  });

  it('compares curves within floating-point noise', () => {
    const copy = structuredClone(triangle);
    copy[0].point = [10 + 1e-9, 10];
    expect(sameCurve({ points: triangle }, { points: copy })).toBe(true);
    copy[0].out_handle = [21, 0];
    expect(sameCurve({ points: triangle }, { points: copy })).toBe(false);
    expect(sameCurve(null, undefined)).toBe(true);
    expect(sameCurve({ points: triangle }, null)).toBe(false);
  });

  it('ignores handles of corners when comparing', () => {
    const a = { points: [{ ...corner(0, 0), in_handle: [5, 5] as Position }, corner(1, 0), corner(0, 1)] };
    const b = { points: [corner(0, 0), corner(1, 0), corner(0, 1)] };
    expect(sameCurve(a, b)).toBe(true);
  });
});
