import { useCallback, useRef } from 'react';
import { useViewerEvent, type ViewerEventName } from '../../../hooks/useViewerEvent';
import type { Slide } from '../../../types/slide';
import { fitSlideRect } from '../utils/viewport';
import { useOsdViewer } from './useOsdViewer';

const OPEN_EVENTS: readonly ViewerEventName[] = ['open'];

/** Opens the viewer zoomed onto the detected tissue and offers a way to return to it. */
export function useTissueFocus(slide: Pick<Slide, 'tissue_bbox' | 'image_offset'>) {
  const viewer = useOsdViewer();
  const focusedOnOpen = useRef(false);
  const { tissue_bbox: tissueBox, image_offset: offset } = slide;

  const focusTissue = useCallback(
    (immediately = false) => {
      if (viewer && tissueBox) fitSlideRect(viewer, tissueBox, offset, immediately);
    },
    [viewer, tissueBox, offset],
  );

  useViewerEvent(viewer, OPEN_EVENTS, (current) => {
    if (focusedOnOpen.current || current.world.getItemCount() === 0) return;
    focusedOnOpen.current = true;
    focusTissue(true);
  });

  return { focusTissue, hasTissue: tissueBox !== null };
}
