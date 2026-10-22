import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getDziUrl } from '../../../services/slidesApi';
import type { SlideDetail } from '../../../types/slide';
import { getNativeMagnification } from '../../../utils/magnification';
import { useMiddleButtonPan } from '../hooks/useMiddleButtonPan';
import { useTissueFocus } from '../hooks/useTissueFocus';
import { createViewerOptions } from '../viewerOptions';
import ViewerStatusBar from './ViewerStatusBar';
import ViewerStatusBarHost from './ViewerStatusBarHost';
import './SlideViewer.css';

interface SlideViewerProps {
  slide: SlideDetail;
  /** Extra overlays rendered on top of the viewer canvas (e.g. the hotspot tools). */
  children?: ReactNode;
}

/**
 * Deep Zoom viewer for one slide, with a status bar below it; the page adds its tools as children. Must be
 * rendered inside `<OpenSeadragonAnnotator>`, which owns the OpenSeadragon viewer instance.
 */
export default function SlideViewer({ slide, children }: SlideViewerProps) {
  const options = useMemo(() => createViewerOptions(getDziUrl(slide.id)), [slide.id]);
  // Fits the tissue into view when the slide opens; zooming is the wheel (the status bar shows the level).
  useTissueFocus(slide);
  useMiddleButtonPan();
  const nativeMagnification = getNativeMagnification(slide);

  return (
    <div className="slide-viewer">
      <div className="slide-viewer__frame">
        <OpenSeadragonViewer className="slide-viewer__canvas" options={options} />
        {children}
      </div>
      <ViewerStatusBarHost>
        <ViewerStatusBar slide={slide} nativeMagnification={nativeMagnification} />
      </ViewerStatusBarHost>
    </div>
  );
}
