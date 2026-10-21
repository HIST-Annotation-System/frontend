import { Minus, Plus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useOsdViewer } from '../hooks/useOsdViewer';
import { zoomToImageZoom } from '../utils/viewport';

const ZOOM_STEP = 1.3;

interface ZoomControlsProps {
  /** Fits the detected tissue; without it "Dopasuj" fits the whole slide. */
  onFocusTissue?: () => void;
  /** Offer a full-resolution jump; redundant when a magnification preset already reaches it. */
  showActualSize: boolean;
}

export default function ZoomControls({ onFocusTissue, showActualSize }: ZoomControlsProps) {
  const viewer = useOsdViewer();

  const zoomBy = (factor: number) => {
    if (!viewer) return;
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  };

  return (
    <>
      <Button icon={<Minus size={12} />} title="Oddal" aria-label="Oddal" onClick={() => zoomBy(1 / ZOOM_STEP)} />
      <Button icon={<Plus size={12} />} title="Przybliż" aria-label="Przybliż" onClick={() => zoomBy(ZOOM_STEP)} />
      <Button
        title={onFocusTissue ? 'Dopasuj widok do tkanki' : 'Dopasuj cały obraz do okna'}
        onClick={() => (onFocusTissue ? onFocusTissue() : viewer?.viewport.goHome())}
      >
        Dopasuj
      </Button>
      {showActualSize && (
        <Button
          className="tabular"
          title="Pełna rozdzielczość (1 piksel ekranu = 1 piksel skanu)"
          onClick={() => viewer && zoomToImageZoom(viewer, 1)}
        >
          1:1
        </Button>
      )}
    </>
  );
}
