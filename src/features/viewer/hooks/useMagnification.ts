import { useState } from 'react';
import { useViewerEvent, type ViewerEventName } from '../../../hooks/useViewerEvent';
import { imageZoomToMagnification } from '../../../utils/magnification';
import { getImageZoom } from '../utils/viewport';
import { useOsdViewer } from './useOsdViewer';

const ZOOM_EVENTS: readonly ViewerEventName[] = ['open', 'zoom', 'resize', 'animation-finish'];

/** Live zoom level of the viewer, expressed as image zoom and (when known) microscope magnification. */
export function useMagnification(nativeMagnification: number | null) {
  const viewer = useOsdViewer();
  const [imageZoom, setImageZoom] = useState<number | null>(null);

  useViewerEvent(viewer, ZOOM_EVENTS, (current) => {
    const zoom = getImageZoom(current);
    // Rounding avoids re-rendering for imperceptible changes during animations.
    setImageZoom(zoom === null ? null : Math.round(zoom * 10_000) / 10_000);
  });

  return {
    imageZoom,
    magnification:
      imageZoom !== null && nativeMagnification ? imageZoomToMagnification(imageZoom, nativeMagnification) : null,
  };
}
