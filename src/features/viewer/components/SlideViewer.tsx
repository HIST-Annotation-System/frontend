import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import { getDziUrl } from '../../../services/slidesApi';
import type { SlideDetail } from '../../../types/slide';
import { availablePresets, getNativeMagnification } from '../../../utils/magnification';
import { useTissueFocus } from '../hooks/useTissueFocus';
import { createViewerOptions } from '../viewerOptions';
import ViewerLayout from './ViewerLayout';
import ViewerStatusBar from './ViewerStatusBar';

interface SlideViewerProps {
  slide: SlideDetail;
  tools?: ReactNode;
  /** Inspector panels below the navigator. */
  inspector?: ReactNode;
  inspectorOpen: boolean;
  /** Left end of the status bar. */
  hint?: ReactNode;
  /** Overlays drawn on the canvas (e.g. the hotspot boxes). */
  children?: ReactNode;
}

/**
 * Deep Zoom viewer for one slide, in the docked viewer layout. Must be rendered inside
 * `<OpenSeadragonAnnotator>`, which owns the OpenSeadragon viewer instance.
 */
export default function SlideViewer({ slide, tools, inspector, inspectorOpen, hint, children }: SlideViewerProps) {
  const options = useMemo(() => createViewerOptions(getDziUrl(slide.id)), [slide.id]);
  const { focusTissue, hasTissue } = useTissueFocus(slide);
  const nativeMagnification = getNativeMagnification(slide);
  const showActualSize =
    nativeMagnification === null || !availablePresets(nativeMagnification).includes(nativeMagnification);

  return (
    <ViewerLayout
      tools={tools}
      inspector={inspector}
      inspectorOpen={inspectorOpen}
      status={
        <ViewerStatusBar
          hint={hint}
          offset={slide.image_offset}
          nativeMagnification={nativeMagnification}
          mpp={slide.mpp_x}
          presets
          onFocusTissue={hasTissue ? () => focusTissue() : undefined}
          showActualSize={showActualSize}
        />
      }
    >
      <OpenSeadragonViewer className="viewer-layout__canvas" options={options} />
      {children}
    </ViewerLayout>
  );
}
