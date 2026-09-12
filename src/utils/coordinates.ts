import type { Offset, Position, Rect } from '../types/geometry';

// The viewer works in Deep Zoom image coordinates; the API stores level-0 slide coordinates.
// They differ by the slide's `image_offset` when the scan area is cropped to its bounds.

export const imageToSlidePosition = ([x, y]: Position, offset: Offset): Position => [x + offset.x, y + offset.y];

export const slideToImagePosition = ([x, y]: Position, offset: Offset): Position => [x - offset.x, y - offset.y];

export const slideToImageRect = (rect: Rect, offset: Offset): Rect => ({
  ...rect,
  x: rect.x - offset.x,
  y: rect.y - offset.y,
});

export const imageToSlideRect = (rect: Rect, offset: Offset): Rect => ({
  ...rect,
  x: rect.x + offset.x,
  y: rect.y + offset.y,
});

/** Intersection of `rect` with the area [0, width] x [0, height]; null when they do not overlap. */
export const clampRect = (rect: Rect, width: number, height: number): Rect | null => {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const right = Math.min(width, Math.ceil(rect.x + rect.width));
  const bottom = Math.min(height, Math.ceil(rect.y + rect.height));
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
};
