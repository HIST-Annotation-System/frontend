import { useEffect } from 'react';
import type OpenSeadragon from 'openseadragon';
import { useLatest } from './useLatest';

export type ViewerEventName = keyof OpenSeadragon.ViewerEventMap;

/**
 * Calls `handler` (at most once per animation frame) whenever any of `events` fires on the
 * OpenSeadragon viewer, and once right after subscribing. Pass a stable `events` array.
 */
export function useViewerEvent(
  viewer: OpenSeadragon.Viewer | undefined,
  events: readonly ViewerEventName[],
  handler: (viewer: OpenSeadragon.Viewer) => void,
): void {
  const handlerRef = useLatest(handler);

  useEffect(() => {
    if (!viewer) return undefined;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        handlerRef.current(viewer);
      });
    };
    events.forEach((name) => viewer.addHandler(name, schedule));
    schedule();
    return () => {
      events.forEach((name) => viewer.removeHandler(name, schedule));
      cancelAnimationFrame(frame);
    };
  }, [viewer, events, handlerRef]);
}
