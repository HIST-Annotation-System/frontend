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
