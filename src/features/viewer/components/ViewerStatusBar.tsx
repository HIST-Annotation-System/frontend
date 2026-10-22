import type { Slide } from '../../../types/slide';
import { formatMagnification, formatZoomPercent } from '../../../utils/magnification';
import { useSlideHotspots } from '../../hotspots/hooks/useHotspots';
import { useMagnification } from '../hooks/useMagnification';
import ViewerHintSlot from './ViewerHintSlot';

interface ViewerStatusBarProps {
  slide: Pick<Slide, 'id'>;
  nativeMagnification: number | null;
}

export default function ViewerStatusBar({ slide, nativeMagnification }: ViewerStatusBarProps) {
  const { imageZoom, magnification } = useMagnification(nativeMagnification);
  const { data: hotspots } = useSlideHotspots(slide.id);

  let scale = '—';
  if (magnification !== null) scale = formatMagnification(magnification);
  else if (imageZoom !== null) scale = formatZoomPercent(imageZoom);

  return (
    <div className="viewer-status">
      <ViewerHintSlot />
      <span className="viewer-status__item">
        <span className="viewer-status__label">Powiększenie</span>
        <span className="viewer-status__value viewer-status__value--strong">{scale}</span>
      </span>
      <span className="viewer-status__item">
        <span className="viewer-status__label">Hotspoty</span>
        <span className="viewer-status__value">{hotspots ? hotspots.length : '—'}</span>
      </span>
    </div>
  );
}
