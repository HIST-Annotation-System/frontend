import type OpenSeadragon from 'openseadragon';
import type { Offset, Rect, Size } from '../../../types/geometry';
import { clampRect, imageToSlideRect, slideToImageRect } from '../../../utils/coordinates';

const slideImage = (viewer: OpenSeadragon.Viewer): OpenSeadragon.TiledImage | null =>
  viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;

/** Screen pixels per image pixel (1 = full resolution), or null until the slide has opened. */
export const getImageZoom = (viewer: OpenSeadragon.Viewer): number | null => {
  const image = slideImage(viewer);
  return image ? image.viewportToImageZoom(viewer.viewport.getZoom(true)) : null;
};

export const zoomToImageZoom = (viewer: OpenSeadragon.Viewer, imageZoom: number): void => {
  const image = slideImage(viewer);
  if (!image) return;
  viewer.viewport.zoomTo(image.imageToViewportZoom(imageZoom));
  viewer.viewport.applyConstraints();
};

/** Fraction of the rectangle's size added as a margin on every side when fitting it into view. */
const FIT_MARGIN = 0.05;

/** Fit a level-0 slide rectangle into view, with a small margin around it. */
export const fitSlideRect = (viewer: OpenSeadragon.Viewer, rect: Rect, offset: Offset, immediately = false): void => {
  const image = slideImage(viewer);
  if (!image) return;
  const { x, y, width, height } = slideToImageRect(rect, offset);
  const marginX = width * FIT_MARGIN;
  const marginY = height * FIT_MARGIN;
  viewer.viewport.fitBounds(
    image.imageToViewportRectangle(x - marginX, y - marginY, width + 2 * marginX, height + 2 * marginY),
    immediately,
  );
};

/** The level-0 rectangle currently visible, clipped to the slide; null when nothing is visible. */
export const getVisibleSlideRect = (viewer: OpenSeadragon.Viewer, offset: Offset, slideSize: Size): Rect | null => {
  const image = slideImage(viewer);
  if (!image) return null;
  const { x, y, width, height } = image.viewportToImageRectangle(viewer.viewport.getBounds(true));
  return clampRect(imageToSlideRect({ x, y, width, height }, offset), slideSize.width, slideSize.height);
};

/** The Deep Zoom image rectangle shown by the whole viewer container (not clipped to the image); null until open. */
export const getVisibleImageRect = (viewer: OpenSeadragon.Viewer): Rect | null => {
  const image = slideImage(viewer);
  if (!image) return null;
  const { x, y, width, height } = image.viewportToImageRectangle(viewer.viewport.getBounds(true));
  return { x, y, width, height };
};
