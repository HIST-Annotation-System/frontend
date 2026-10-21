import { useEffect, useLayoutEffect, useRef } from 'react';
import { useOsdViewer } from '../hooks/useOsdViewer';

export const NAVIGATOR_ID = 'viewer-navigator';

/**
 * Host of OpenSeadragon's minimap (the viewer options point `navigatorId` here).
 *
 * OpenSeadragon looks the element up while the viewer is created (in a layout effect) and re-parents it, so the
 * element is created here outside React, and this component must come before `<OpenSeadragonViewer>` in the tree:
 * its layout effect then runs first, including on StrictMode's re-run.
 */
export default function ViewerNavigator() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewer = useOsdViewer();

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const element = document.createElement('div');
    element.id = NAVIGATOR_ID;
    element.className = 'viewer-navigator__element';
    host.appendChild(element);
    return () => host.replaceChildren();
  }, []);

  // The minimap only measures itself when created; the panel may have been hidden or resized since.
  useEffect(() => {
    const host = hostRef.current;
    if (!viewer || !host) return undefined;
    const observer = new ResizeObserver(() => viewer.navigator?.updateSize());
    observer.observe(host);
    return () => observer.disconnect();
  }, [viewer]);

  return <div className="viewer-navigator" ref={hostRef} />;
}
