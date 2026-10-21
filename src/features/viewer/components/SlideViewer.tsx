import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getDziUrl } from '../../../services/slidesApi';
import type { SlideDetail } from '../../../types/slide';
import { availablePresets, getNativeMagnification } from '../../../utils/magnification';
import { useTissueFocus } from '../hooks/useTissueFocus';
import { createViewerOptions } from '../viewerOptions';
import MagnificationPresets from './MagnificationPresets';
import ViewerStatusBar from './ViewerStatusBar';
import ZoomControls from './ZoomControls';
import './SlideViewer.css';

interface SlideViewerProps {
  slide: SlideDetail;
  /** Extra overlays rendered on top of the viewer canvas (e.g. the hotspot tools). */
  children?: ReactNode;
}

/**
 * Deep Zoom viewer for one slide: a floating navigation panel over the canvas and a status bar below it. Must be
 * rendered inside `<OpenSeadragonAnnotator>`, which owns the OpenSeadragon viewer instance.
 */
export default function SlideViewer({ slide, children }: SlideViewerProps) {
  const options = useMemo(() => createViewerOptions(getDziUrl(slide.id)), [slide.id]);
  const { focusTissue, hasTissue } = useTissueFocus(slide);
  const nativeMagnification = getNativeMagnification(slide);
  const showActualSize =
    nativeMagnification === null || !availablePresets(nativeMagnification).includes(nativeMagnification);

  return (
    <div className="slide-viewer">
      <div className="slide-viewer__frame">
        <OpenSeadragonViewer className="slide-viewer__canvas" options={options} />
        <div
          className="viewer-nav viewer-nav--vertical"
          role="toolbar"
          aria-label="Nawigacja"
          aria-orientation="vertical"
        >
          <ZoomControls
            onFocusTissue={hasTissue ? () => focusTissue() : undefined}
            showActualSize={showActualSize}
          />
          <span className="viewer-nav__divider" aria-hidden="true" />
          <MagnificationPresets nativeMagnification={nativeMagnification} />
        </div>
        {children}
      </div>
      <div className="slide-viewer__bar">
        <ViewerStatusBar slide={slide} nativeMagnification={nativeMagnification} />
      </div>
    </div>
  );
}
