import { useRef } from 'react';
import { useViewerEvent, type ViewerEventName } from '../../../hooks/useViewerEvent';
import type { Slide } from '../../../types/slide';
import { fitSlideRect } from '../utils/viewport';
import { useOsdViewer } from './useOsdViewer';

const OPEN_EVENTS: readonly ViewerEventName[] = ['open'];

/** Opens the viewer zoomed onto the detected tissue. */
export function useTissueFocus(slide: Pick<Slide, 'tissue_bbox' | 'image_offset'>): void {
  const viewer = useOsdViewer();
  const focusedOnOpen = useRef(false);
  const { tissue_bbox: tissueBox, image_offset: offset } = slide;

  useViewerEvent(viewer, OPEN_EVENTS, (current) => {
    if (focusedOnOpen.current || current.world.getItemCount() === 0) return;
    focusedOnOpen.current = true;
    if (tissueBox) fitSlideRect(current, tissueBox, offset, true);
  });
}
