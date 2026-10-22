import OpenSeadragon from 'openseadragon';
import { useEffect } from 'react';
import { useOsdViewer } from './useOsdViewer';

const MIDDLE_BUTTON = 1;

/**
 * Dragging with the middle mouse button always pans the image, whatever tool is active. The press is taken on
 * the window in the capture phase, before OpenSeadragon, Annotorious and the drawing tools see it, so no tool
 * adds a point, paints or changes the selection; the browser's middle-click autoscroll is blocked over the image.
 */
export function useMiddleButtonPan() {
  const viewer = useOsdViewer();

  useEffect(() => {
    if (!viewer) return undefined;
    let pan: { pointerId: number; x: number; y: number } | null = null;
    const overImage = (event: Event) => event.target instanceof Node && viewer.element.contains(event.target);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== MIDDLE_BUTTON || !overImage(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pan || event.pointerId !== pan.pointerId) return;
      event.stopImmediatePropagation();
      const delta = new OpenSeadragon.Point(pan.x - event.clientX, pan.y - event.clientY);
      pan = { ...pan, x: event.clientX, y: event.clientY };
      viewer.viewport.panBy(viewer.viewport.deltaPointsFromPixels(delta), true);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pan || event.pointerId !== pan.pointerId) return;
      event.stopImmediatePropagation();
      pan = null;
      viewer.viewport.applyConstraints();
    };
    // Autoscroll starts on mousedown, and a middle click on a link would open it in a new tab.
    const blockMiddle = (event: MouseEvent) => {
      if (event.button !== MIDDLE_BUTTON || !overImage(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('mousedown', blockMiddle, true);
    window.addEventListener('mouseup', blockMiddle, true);
    window.addEventListener('auxclick', blockMiddle, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('mousedown', blockMiddle, true);
      window.removeEventListener('mouseup', blockMiddle, true);
      window.removeEventListener('auxclick', blockMiddle, true);
    };
  }, [viewer]);
}
