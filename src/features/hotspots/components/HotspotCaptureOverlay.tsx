import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import { useViewerEvent, type ViewerEventName } from '../../../hooks/useViewerEvent';
import type { Hotspot } from '../../../types/hotspot';
import type { SlideDetail } from '../../../types/slide';
import { useOsdViewer } from '../../viewer/hooks/useOsdViewer';
import { getVisibleImageRect } from '../../viewer/utils/viewport';
import { frameToSlideSquare, MIN_HOTSPOT_SIZE, type SlideSquare } from '../utils/hotspotSquare';
import { formatSquareSize } from '../utils/hotspotFormat';
import CreateHotspotModal from './CreateHotspotModal';
import './Hotspots.css';

const VIEWPORT_EVENTS: readonly ViewerEventName[] = ['open', 'animation', 'animation-finish', 'resize'];

interface HotspotCaptureOverlayProps {
  slide: SlideDetail;
  onClose: () => void;
  onCreated: (hotspot: Hotspot) => void;
}

/**
 * A square capture frame over the slide viewer, like a camera viewfinder: the user pans and zooms the
 * slide underneath it, then saves the framed square as a hotspot.
 */
export default function HotspotCaptureOverlay({ slide, onClose, onCreated }: HotspotCaptureOverlayProps) {
  const viewer = useOsdViewer();
  const frameRef = useRef<HTMLDivElement>(null);
  const [square, setSquare] = useState<SlideSquare | null>(null);
  const [pendingSquare, setPendingSquare] = useState<SlideSquare | null>(null);

  const measure = useCallback((): SlideSquare | null => {
    const frame = frameRef.current;
    if (!viewer || !frame || !slide.width || !slide.height) return null;
    const visible = getVisibleImageRect(viewer);
    if (!visible) return null;
    const containerBox = viewer.container.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    return frameToSlideSquare(
      visible,
      { width: containerBox.width, height: containerBox.height },
      { x: frameBox.left - containerBox.left, y: frameBox.top - containerBox.top, width: frameBox.width, height: frameBox.height },
      slide.image_offset,
      { width: slide.width, height: slide.height },
    );
  }, [viewer, slide.width, slide.height, slide.image_offset]);

  useViewerEvent(viewer, VIEWPORT_EVENTS, () => setSquare(measure()));

  // Esc leaves capture mode (the modal handles its own Esc while open).
  useEffect(() => {
    if (pendingSquare) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingSquare, onClose]);

  return (
    <>
      <div className="hotspot-capture">
        <div ref={frameRef} className="hotspot-capture__frame" />
        <div className="hotspot-capture__panel" role="group" aria-label="Wybór hotspotu">
          <span className="hotspot-capture__size mono-data">
            {square ? formatSquareSize(square.size, slide.mpp_x) : `Przybliż obraz (min. ${MIN_HOTSPOT_SIZE} px)`}
          </span>
          <Button
            variant="primary"
            icon={<Check size={16} />}
            disabled={!square}
            onClick={() => setPendingSquare(measure())}
          >
            Zapisz hotspot
          </Button>
          <Button icon={<X size={16} />} title="Anuluj (Esc)" aria-label="Anuluj wybór hotspotu" onClick={onClose} />
        </div>
      </div>
      {/* Outside the overlay: it sets pointer-events: none (inherited), which would make the dialog unclickable. */}
      {pendingSquare && (
        <CreateHotspotModal
          slide={slide}
          square={pendingSquare}
          onClose={() => setPendingSquare(null)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
