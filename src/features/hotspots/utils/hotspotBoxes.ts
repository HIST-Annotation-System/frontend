import type { Offset, Position, Rect, Size } from '../../../types/geometry';

/** Side of every hotspot cut from a slide, in level-0 pixels (the server stores it at full resolution). */
export const HOTSPOT_BOX_SIZE = 1024;

/** Most boxes one selection may turn into hotspots. */
export const MAX_BATCH_BOXES = 100;

/** How boxes are chosen: on a grid anchored where the first drag started, or painted freely with a brush. */
export type HotspotTool = 'grid' | 'brush';

/** A box to cut out, by its level-0 top-left corner (its side is always `HOTSPOT_BOX_SIZE`). */
export type Box = Offset;

/** Inclusive row and column ranges of grid boxes, counted from the grid origin (may be negative). */
export interface GridRange {
  rows: [number, number];
  cols: [number, number];
}

export const boxKey = (box: Box): string => `${box.x},${box.y}`;

const span = (from: number, to: number, origin: number): [number, number] => {
  const a = (from - origin) / HOTSPOT_BOX_SIZE;
  const b = (to - origin) / HOTSPOT_BOX_SIZE;
  const first = Math.floor(Math.min(a, b));
  // One box as soon as the drag starts, one more each time the pointer crosses another box side.
  return [first, Math.max(first, Math.ceil(Math.max(a, b)) - 1)];
};

/** The grid boxes a drag from `start` to `end` (level-0 pixels) touches. */
export const dragRange = (origin: Offset, start: Position, end: Position): GridRange => ({
  rows: span(start[1], end[1], origin.y),
  cols: span(start[0], end[0], origin.x),
});

export const sameRange = (a: GridRange, b: GridRange): boolean =>
  a.rows[0] === b.rows[0] && a.rows[1] === b.rows[1] && a.cols[0] === b.cols[0] && a.cols[1] === b.cols[1];

/** The level-0 area a range of grid boxes covers. */
export const rangeRect = (origin: Offset, { rows, cols }: GridRange): Rect => ({
  x: origin.x + cols[0] * HOTSPOT_BOX_SIZE,
  y: origin.y + rows[0] * HOTSPOT_BOX_SIZE,
  width: (cols[1] - cols[0] + 1) * HOTSPOT_BOX_SIZE,
  height: (rows[1] - rows[0] + 1) * HOTSPOT_BOX_SIZE,
});

/** The grid box under a level-0 point. */
export const gridBoxAt = (origin: Offset, [x, y]: Position): Box => ({
  x: origin.x + Math.floor((x - origin.x) / HOTSPOT_BOX_SIZE) * HOTSPOT_BOX_SIZE,
  y: origin.y + Math.floor((y - origin.y) / HOTSPOT_BOX_SIZE) * HOTSPOT_BOX_SIZE,
});

/** Whether the box lies wholly inside the slide (only those can become hotspots). */
export const isInside = (box: Box, slideSize: Size): boolean =>
  box.x >= 0 && box.y >= 0 && box.x + HOTSPOT_BOX_SIZE <= slideSize.width && box.y + HOTSPOT_BOX_SIZE <= slideSize.height;

/**
 * The range's grid boxes lying wholly inside the slide; null when there are more than `limit` (a drag far
 * out of zoom would otherwise list thousands).
 */
export const rangeBoxes = (origin: Offset, range: GridRange, slideSize: Size, limit = MAX_BATCH_BOXES): Box[] | null => {
  const boxes: Box[] = [];
  for (let row = range.rows[0]; row <= range.rows[1]; row++) {
    for (let col = range.cols[0]; col <= range.cols[1]; col++) {
      const box = { x: origin.x + col * HOTSPOT_BOX_SIZE, y: origin.y + row * HOTSPOT_BOX_SIZE };
      if (!isInside(box, slideSize)) continue;
      if (boxes.length === limit) return null;
      boxes.push(box);
    }
  }
  return boxes;
};

/** Whether the box's centre lies in the area (how a right-drag over a grid range picks boxes to remove). */
export const isCentredIn = (box: Box, area: Rect): boolean => {
  const x = box.x + HOTSPOT_BOX_SIZE / 2;
  const y = box.y + HOTSPOT_BOX_SIZE / 2;
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
};

export const contains = (box: Box, [x, y]: Position): boolean =>
  x >= box.x && x < box.x + HOTSPOT_BOX_SIZE && y >= box.y && y < box.y + HOTSPOT_BOX_SIZE;

export const overlaps = (a: Box, b: Box): boolean =>
  Math.abs(a.x - b.x) < HOTSPOT_BOX_SIZE && Math.abs(a.y - b.y) < HOTSPOT_BOX_SIZE;

/** The brush box centred on a level-0 point, moved wholly inside the slide; null when the slide is smaller. */
export const brushBoxAt = ([x, y]: Position, slideSize: Size): Box | null => {
  if (slideSize.width < HOTSPOT_BOX_SIZE || slideSize.height < HOTSPOT_BOX_SIZE) return null;
  const clamp = (value: number, length: number) =>
    Math.min(Math.max(Math.round(value - HOTSPOT_BOX_SIZE / 2), 0), length - HOTSPOT_BOX_SIZE);
  return { x: clamp(x, slideSize.width), y: clamp(y, slideSize.height) };
};

/** Brush step along a stroke: fine enough that a fast pointer still paints a continuous trail. */
const STROKE_STEP = HOTSPOT_BOX_SIZE / 4;

/** Points along a brush stroke from `from` (exclusive) to `to` (inclusive). */
export const strokePoints = (from: Position, to: Position): Position[] => {
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / STROKE_STEP));
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  });
};
