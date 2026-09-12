import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getDziUrl } from '../../../services/slidesApi';
import type { SlideDetail } from '../../../types/slide';
import { availablePresets, getNativeMagnification } from '../../../utils/magnification';
import { useTissueFocus } from '../hooks/useTissueFocus';
import { createViewerOptions } from '../viewerOptions';
import MagnificationPresets from './MagnificationPresets';
import RegionExportButton from './RegionExportButton';
import ViewerStatusBar from './ViewerStatusBar';
import ZoomControls from './ZoomControls';
import './SlideViewer.css';

interface SlideViewerProps {
  slide: SlideDetail;
  onError: (message: string) => void;
  /** Extra overlays rendered on top of the viewer canvas (e.g. annotation tools). */
  children?: ReactNode;
}

/**
 * Deep Zoom viewer for one slide: an action bar above the canvas. Must be rendered inside
 * `<OpenSeadragonAnnotator>`, which owns the OpenSeadragon viewer instance shared with the annotation layer.
 */
export default function SlideViewer({ slide, onError, children }: SlideViewerProps) {
  const options = useMemo(() => createViewerOptions(getDziUrl(slide.id)), [slide.id]);
  const { focusTissue, hasTissue } = useTissueFocus(slide);
  const nativeMagnification = getNativeMagnification(slide);
  const showActualSize =
    nativeMagnification === null || !availablePresets(nativeMagnification).includes(nativeMagnification);

  return (
    <div className="slide-viewer">
      <div className="slide-viewer__bar">
        <ViewerStatusBar slide={slide} nativeMagnification={nativeMagnification} />
        <div className="slide-viewer__actions" role="toolbar" aria-label="Nawigacja">
          <MagnificationPresets nativeMagnification={nativeMagnification} />
          <div className="btn-group">
            <ZoomControls
              onFocusTissue={hasTissue ? () => focusTissue() : undefined}
              showActualSize={showActualSize}
            />
          </div>
          <RegionExportButton slide={slide} onError={onError} />
        </div>
      </div>
      <div className="slide-viewer__frame">
        <OpenSeadragonViewer className="slide-viewer__canvas" options={options} />
        {children}
      </div>
    </div>
  );
}
