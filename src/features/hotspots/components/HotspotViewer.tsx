import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getHotspotImageUrl } from '../../../services/hotspotsApi';
import type { Hotspot } from '../../../types/hotspot';
import ViewerLayout from '../../viewer/components/ViewerLayout';
import ViewerStatusBar from '../../viewer/components/ViewerStatusBar';
import { createViewerOptions } from '../../viewer/viewerOptions';

const HOTSPOT_MAX_ZOOM_PIXEL_RATIO = 10;

/** Annotations live in hotspot image pixels, so the viewer and API coordinates coincide. */
const NO_OFFSET = { x: 0, y: 0 };

interface HotspotViewerProps {
  hotspot: Hotspot;
  tools?: ReactNode;
  /** Inspector panels below the navigator. */
  inspector?: ReactNode;
  inspectorOpen: boolean;
  /** Left end of the status bar. */
  hint?: ReactNode;
  /** Overlays drawn on the canvas. */
  children?: ReactNode;
}

/**
 * The hotspot image in OpenSeadragon (one PNG/JPEG, no Deep Zoom pyramid), laid out like the slide viewer.
 * Must be rendered inside `<OpenSeadragonAnnotator>`, which owns the viewer shared with the annotation layer.
 */
export default function HotspotViewer({ hotspot, tools, inspector, inspectorOpen, hint, children }: HotspotViewerProps) {
  const options = useMemo(
    () =>
      createViewerOptions(
        { type: 'image', url: getHotspotImageUrl(hotspot.id) },
        { maxZoomPixelRatio: HOTSPOT_MAX_ZOOM_PIXEL_RATIO },
      ),
    [hotspot.id],
  );

  return (
    <ViewerLayout
      tools={tools}
      inspector={inspector}
      inspectorOpen={inspectorOpen}
      status={<ViewerStatusBar hint={hint} offset={NO_OFFSET} nativeMagnification={null} mpp={hotspot.mpp} showActualSize />}
    >
      <OpenSeadragonViewer className="viewer-layout__canvas" options={options} />
      {children}
    </ViewerLayout>
  );
}
