import type { Position } from '../../../types/geometry';

const SAMPLE_SPACING_PX = 2;
const SMOOTHING_RADIUS = 2;
const SIMPLIFY_TOLERANCE_PX = 1.5;
/** Smaller strokes (screen px²) are treated as an accidental click. */
const MIN_AREA_PX2 = 16;
/** Each point becomes a smooth curve point, flattened to CURVE_SEGMENT_STEPS vertices (API limit: 10 000). */
const MAX_OUTLINE_POINTS = 600;

/** Moving average over `radius` neighbours on each side; the ends of the stroke stay in place. */
export const smoothStroke = (points: readonly Position[], radius: number): Position[] =>
  points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point;
    const reach = Math.min(radius, index, points.length - 1 - index);
    let x = 0;
    let y = 0;
    for (let offset = -reach; offset <= reach; offset += 1) {
      x += points[index + offset][0];
      y += points[index + offset][1];
    }
    const count = 2 * reach + 1;
    return [x / count, y / count];
  });

const distanceToSegment = ([px, py]: Position, [ax, ay]: Position, [bx, by]: Position): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** Ramer–Douglas–Peucker simplification of an open stroke (iterative). */
export const simplifyStroke = (points: readonly Position[], tolerance: number): Position[] => {
  if (points.length < 3) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const ranges: [number, number][] = [[0, points.length - 1]];
  while (ranges.length > 0) {
    const [start, end] = ranges.pop()!;
    let farthest = -1;
    let farthestDistance = tolerance;
    for (let index = start + 1; index < end; index += 1) {
      const distance = distanceToSegment(points[index], points[start], points[end]);
      if (distance > farthestDistance) {
        farthest = index;
        farthestDistance = distance;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = true;
      ranges.push([start, farthest], [farthest, end]);
    }
  }
  return points.filter((_, index) => keep[index]);
};

/** Area enclosed by the ring (shoelace formula). */
export const ringArea = (points: readonly Position[]): number => {
  let twiceArea = 0;
  points.forEach(([x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    twiceArea += x * nextY - nextX * y;
  });
  return Math.abs(twiceArea) / 2;
};

const segmentIntersection = (a: Position, b: Position, c: Position, d: Position): Position | null => {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return null;
  const qx = c[0] - a[0];
  const qy = c[1] - a[1];
  const t = (qx * sy - qy * sx) / denominator;
  const u = (qx * ry - qy * rx) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * rx, a[1] + t * ry] : null;
};

/**
 * Cuts off the part of a stroke that runs on past its start, so the closed outline does not cross itself.
 * Small accidental loops are kept: the cut loop must enclose at least half of the area.
 */
export const trimOvershoot = (points: readonly Position[]): Position[] => {
  const half = Math.floor(points.length / 2);
  let best: { start: number; end: number; at: Position } | null = null;
  for (let start = 0; start < half; start += 1) {
    for (let end = points.length - 2; end >= Math.max(half, start + 2); end -= 1) {
      const at = segmentIntersection(points[start], points[start + 1], points[end], points[end + 1]);
      if (!at) continue;
      if (!best || end - start > best.end - best.start) best = { start, end, at };
      break;
    }
  }
  if (!best) return [...points];
  const loop = [best.at, ...points.slice(best.start + 1, best.end + 1)];
  return loop.length >= 3 && ringArea(loop) >= ringArea(points) / 2 ? loop : [...points];
};

/** True when the pointer moved far enough (at the current zoom) to record a new point. */
export const isFarEnough = (from: Position, to: Position, viewportScale: number): boolean =>
  Math.hypot(to[0] - from[0], to[1] - from[1]) * viewportScale >= SAMPLE_SPACING_PX;

/** Vertices of the closed outline of a recorded stroke (image pixels), or null when it is too small. */
export const strokeToOutline = (stroke: readonly Position[], viewportScale: number): Position[] | null => {
  if (stroke.length < 3) return null;
  const smoothed = smoothStroke(stroke, SMOOTHING_RADIUS);
  let tolerance = SIMPLIFY_TOLERANCE_PX / viewportScale;
  let outline = simplifyStroke(smoothed, tolerance);
  while (outline.length > MAX_OUTLINE_POINTS) {
    tolerance *= 1.5;
    outline = simplifyStroke(smoothed, tolerance);
  }
  outline = trimOvershoot(outline);
  if (outline.length > 3 && !isFarEnough(outline[outline.length - 1], outline[0], viewportScale)) outline.pop();
  if (outline.length < 3 || ringArea(outline) * viewportScale * viewportScale < MIN_AREA_PX2) return null;
  return outline;
};
