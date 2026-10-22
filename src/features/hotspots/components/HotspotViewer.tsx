import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getHotspotImageUrl } from '../../../services/hotspotsApi';
import type { Hotspot } from '../../../types/hotspot';
import { formatZoomPercent } from '../../../utils/magnification';
import ZoomControls from '../../viewer/components/ZoomControls';
import { useMagnification } from '../../viewer/hooks/useMagnification';
import { useMiddleButtonPan } from '../../viewer/hooks/useMiddleButtonPan';
import ViewerHintSlot from '../../viewer/components/ViewerHintSlot';
import ViewerStatusBarHost from '../../viewer/components/ViewerStatusBarHost';
import { createViewerOptions } from '../../viewer/viewerOptions';
import '../../viewer/components/SlideViewer.css';

const HOTSPOT_MAX_ZOOM_PIXEL_RATIO = 10;

interface HotspotViewerProps {
  hotspot: Hotspot;
  /** Extra status bar items after the zoom (e.g. the annotation count and selection). */
  status?: ReactNode;
  /** Extra overlays rendered on top of the viewer canvas (e.g. annotation tools). */
  children?: ReactNode;
}

/**
 * The hotspot image in OpenSeadragon (one PNG/JPEG, no Deep Zoom pyramid), laid out like the slide viewer
 * (navigation floats top-right, the status bar sits below the canvas).
 * Must be rendered inside `<OpenSeadragonAnnotator>`, which owns the viewer shared with the annotation layer.
 */
export default function HotspotViewer({ hotspot, status, children }: HotspotViewerProps) {
  const options = useMemo(
    () =>
      createViewerOptions(
        { type: 'image', url: getHotspotImageUrl(hotspot.id) },
        { maxZoomPixelRatio: HOTSPOT_MAX_ZOOM_PIXEL_RATIO },
      ),
    [hotspot.id],
  );
  const { imageZoom } = useMagnification(null);
  useMiddleButtonPan();
  const zoom = imageZoom === null ? '—' : formatZoomPercent(imageZoom);

  return (
    <div className="slide-viewer">
      <div className="slide-viewer__frame">
        <OpenSeadragonViewer className="slide-viewer__canvas" options={options} />
        <div className="viewer-nav" role="toolbar" aria-label="Nawigacja">
          <ZoomControls zoomLabel={<span className="viewer-nav__zoom">{zoom}</span>} />
        </div>
        {children}
      </div>
      <ViewerStatusBarHost>
        <div className="viewer-status">
          <ViewerHintSlot />
          <span className="viewer-status__item">
            <span className="viewer-status__label">Powiększenie</span>
            <span className="viewer-status__value viewer-status__value--strong">{zoom}</span>
          </span>
          {status}
        </div>
      </ViewerStatusBarHost>
    </div>
  );
}
