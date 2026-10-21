import { Maximize, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '../../../components/ui/Button';
import { useOsdViewer } from '../hooks/useOsdViewer';
import { zoomToImageZoom } from '../utils/viewport';

const ZOOM_STEP = 1.3;

interface ZoomControlsProps {
  /** Fits the detected tissue; without it "Dopasuj" fits the whole slide. */
  onFocusTissue?: () => void;
  /** Offer a full-resolution jump; redundant when a magnification preset already reaches it. */
  showActualSize: boolean;
  /** Shown between "-" and "+" (e.g. the current zoom). */
  zoomLabel?: ReactNode;
}

export default function ZoomControls({ onFocusTissue, showActualSize, zoomLabel }: ZoomControlsProps) {
  const viewer = useOsdViewer();

  const zoomBy = (factor: number) => {
    if (!viewer) return;
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  };

  return (
    <>
      <Button icon={<Minus size={16} />} title="Oddal" aria-label="Oddal" onClick={() => zoomBy(1 / ZOOM_STEP)} />
      {zoomLabel}
      <Button icon={<Plus size={16} />} title="Przybliż" aria-label="Przybliż" onClick={() => zoomBy(ZOOM_STEP)} />
      <Button
        icon={<Maximize size={16} />}
        title={onFocusTissue ? 'Wycentruj: dopasuj widok do tkanki' : 'Wycentruj: dopasuj cały slajd do ekranu'}
        aria-label="Wycentruj"
        onClick={() => (onFocusTissue ? onFocusTissue() : viewer?.viewport.goHome())}
      />
      {showActualSize && (
        <Button
          className="viewer-nav__actual-size"
          title="Pełna rozdzielczość (1 piksel ekranu = 1 piksel skanu)"
          onClick={() => viewer && zoomToImageZoom(viewer, 1)}
        >
          1:1
        </Button>
      )}
    </>
  );
}
