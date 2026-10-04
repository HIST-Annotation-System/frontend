import type { Offset, Rect, Size } from '../../../types/geometry';

/** Smallest hotspot side, in level-0 pixels (anything smaller is not worth annotating). */
export const MIN_HOTSPOT_SIZE = 32;

/** A square of the slide, in level-0 pixels. */
export interface SlideSquare {
  x: number;
  y: number;
  size: number;
}

/**
 * The level-0 square under an on-screen capture frame, moved (and if needed shrunk) to lie wholly inside
 * the slide; null when it would be smaller than `MIN_HOTSPOT_SIZE`.
 *
 * @param visibleImage the Deep Zoom image rectangle shown by the whole viewer container (not clipped to the image)
 * @param container    the viewer container size in screen pixels
 * @param frame        the capture frame in screen pixels, relative to the container
 */
export const frameToSlideSquare = (
  visibleImage: Rect,
  container: Size,
  frame: Rect,
  offset: Offset,
  slideSize: Size,
): SlideSquare | null => {
  if (container.width <= 0) return null;
  const scale = visibleImage.width / container.width;
  const size = Math.min(Math.round(frame.width * scale), slideSize.width, slideSize.height);
  if (size < MIN_HOTSPOT_SIZE) return null;
  const x = Math.round(visibleImage.x + frame.x * scale + offset.x);
  const y = Math.round(visibleImage.y + frame.y * scale + offset.y);
  return {
    x: Math.min(Math.max(x, 0), slideSize.width - size),
    y: Math.min(Math.max(y, 0), slideSize.height - size),
    size,
  };
};
