import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getHotspotImageUrl } from '../../../services/hotspotsApi';
import type { Hotspot } from '../../../types/hotspot';
import { formatZoomPercent } from '../../../utils/magnification';
import ZoomControls from '../../viewer/components/ZoomControls';
import { useMagnification } from '../../viewer/hooks/useMagnification';
import { createViewerOptions } from '../../viewer/viewerOptions';
import '../../viewer/components/SlideViewer.css';

interface HotspotViewerProps {
  hotspot: Hotspot;
  /** Extra overlays rendered on top of the viewer canvas (e.g. annotation tools). */
  children?: ReactNode;
}

/**
 * The hotspot image in OpenSeadragon (one PNG/JPEG, no Deep Zoom pyramid), laid out like the slide viewer.
 * Must be rendered inside `<OpenSeadragonAnnotator>`, which owns the viewer shared with the annotation layer.
 */
export default function HotspotViewer({ hotspot, children }: HotspotViewerProps) {
  const options = useMemo(
    () => createViewerOptions({ type: 'image', url: getHotspotImageUrl(hotspot.id) }),
    [hotspot.id],
  );
  const { imageZoom } = useMagnification(null);

  return (
    <div className="slide-viewer">
      <div className="slide-viewer__bar">
        <div className="viewer-status label-caps">
          <span className="viewer-status__file" title={hotspot.name}>
            Hotspot: <span className="viewer-status__value">{hotspot.name}</span>
          </span>
          <span>Skala: {imageZoom === null ? '—' : formatZoomPercent(imageZoom)}</span>
        </div>
        <div className="slide-viewer__actions" role="toolbar" aria-label="Nawigacja">
          <div className="btn-group">
            <ZoomControls showActualSize />
          </div>
        </div>
      </div>
      <div className="slide-viewer__frame">
        <OpenSeadragonViewer className="slide-viewer__canvas" options={options} />
        {children}
      </div>
    </div>
  );
}
