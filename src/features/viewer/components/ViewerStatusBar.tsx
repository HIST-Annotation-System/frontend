import type { Slide } from '../../../types/slide';
import { formatMagnification, formatZoomPercent } from '../../../utils/magnification';
import { useMagnification } from '../hooks/useMagnification';

interface ViewerStatusBarProps {
  slide: Pick<Slide, 'original_filename'>;
  nativeMagnification: number | null;
}

export default function ViewerStatusBar({ slide, nativeMagnification }: ViewerStatusBarProps) {
  const { imageZoom, magnification } = useMagnification(nativeMagnification);

  let scale = '—';
  if (magnification !== null) scale = formatMagnification(magnification);
  else if (imageZoom !== null) scale = formatZoomPercent(imageZoom);

  return (
    <div className="viewer-status label-caps">
      <span className="viewer-status__file" title={slide.original_filename}>
        Slajd: <span className="viewer-status__value">{slide.original_filename}</span>
      </span>
      <span>Skala: {scale}</span>
    </div>
  );
}
