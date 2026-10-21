import OpenSeadragon from 'openseadragon';
import { useEffect, useState, type ReactNode } from 'react';
import type { Offset, Position } from '../../../types/geometry';
import { formatMagnification, formatZoomPercent } from '../../../utils/magnification';
import { useMagnification } from '../hooks/useMagnification';
import { useOsdViewer } from '../hooks/useOsdViewer';
import MagnificationPresets from './MagnificationPresets';
import ZoomControls from './ZoomControls';

interface ViewerStatusBarProps {
  /** What the active tool does: a `.viewer-status__hint` element, or a `.viewer-status__slot` filled by a portal. */
  hint?: ReactNode;
  /** Viewer image pixels + offset = the coordinates shown (level-0 slide pixels). */
  offset: Offset;
  nativeMagnification: number | null;
  mpp: number | null;
  /** Show objective presets (slides only; a hotspot has no magnification of its own). */
  presets?: boolean;
  onFocusTissue?: () => void;
  showActualSize: boolean;
}

const formatCoordinate = (value: number) => Math.round(value).toLocaleString('pl-PL');

/** The image pixel under the pointer, or null when it is off the image. */
function useCursorPosition(offset: Offset): Position | null {
  const viewer = useOsdViewer();
  const [position, setPosition] = useState<Position | null>(null);
  const { x: offsetX, y: offsetY } = offset;

  useEffect(() => {
    if (!viewer) return undefined;
    const onMove = (event: PointerEvent) => {
      const image = viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;
      if (!image) return;
      const bounds = viewer.element.getBoundingClientRect();
      const point = image.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(event.clientX - bounds.left, event.clientY - bounds.top),
      );
      const { x, y } = image.getContentSize();
      const inside = point.x >= 0 && point.y >= 0 && point.x <= x && point.y <= y;
      setPosition(inside ? [point.x + offsetX, point.y + offsetY] : null);
    };
    const onLeave = () => setPosition(null);
    viewer.element.addEventListener('pointermove', onMove);
    viewer.element.addEventListener('pointerleave', onLeave);
    return () => {
      viewer.element.removeEventListener('pointermove', onMove);
      viewer.element.removeEventListener('pointerleave', onLeave);
    };
  }, [viewer, offsetX, offsetY]);

  return position;
}

/** Bottom bar of the viewer: tool hint and pointer position, then zoom read-out and controls. */
export default function ViewerStatusBar({
  hint,
  offset,
  nativeMagnification,
  mpp,
  presets = false,
  onFocusTissue,
  showActualSize,
}: ViewerStatusBarProps) {
  const { imageZoom, magnification } = useMagnification(nativeMagnification);
  const cursor = useCursorPosition(offset);

  let scale = '—';
  if (magnification !== null) scale = formatMagnification(magnification);
  else if (imageZoom !== null) scale = formatZoomPercent(imageZoom);

  return (
    <>
      {hint}
      {hint && <span className="viewer-status__sep" />}
      <span className="mono-data">
        {cursor ? (
          <>
            x <span className="viewer-status__value">{formatCoordinate(cursor[0])}</span> y{' '}
            <span className="viewer-status__value">{formatCoordinate(cursor[1])}</span>
          </>
        ) : (
          'x — y —'
        )}
      </span>
      <span className="viewer-status__spacer" />
      <span className="mono-data viewer-status__value">{scale}</span>
      {presets && <MagnificationPresets nativeMagnification={nativeMagnification} />}
      <div className="btn-group" role="group" aria-label="Powiększanie">
        <ZoomControls onFocusTissue={onFocusTissue} showActualSize={showActualSize} />
      </div>
      <span className="viewer-status__sep" />
      <span className="mono-data">{mpp ? `${mpp.toFixed(4).replace('.', ',')} µm/px` : '— µm/px'}</span>
    </>
  );
}
