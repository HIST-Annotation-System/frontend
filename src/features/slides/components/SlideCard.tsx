import { ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getThumbnailUrl } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import { formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import SlideStatusBadge from './SlideStatusBadge';

interface SlideCardProps {
  slide: Slide;
}

export default function SlideCard({ slide }: SlideCardProps) {
  const magnification = getNativeMagnification(slide);
  const content = (
    <>
      <div className="slide-card__thumbnail">
        {slide.status === 'ready' ? (
          <img src={getThumbnailUrl(slide.id)} alt={`Miniatura slajdu ${slide.name}`} loading="lazy" />
        ) : (
          <ImageOff size={28} aria-hidden="true" />
        )}
      </div>
      <div className="slide-card__body">
        <div className="slide-card__title-row">
          <span className="slide-card__name" title={slide.original_filename}>
            {slide.name}
          </span>
          {slide.status !== 'ready' && <SlideStatusBadge status={slide.status} />}
        </div>
        <span className="slide-card__meta">
          {formatDimensions(slide.width, slide.height)}
          {magnification ? ` · ${magnification}×` : ''}
          {slide.vendor ? ` · ${slide.vendor}` : ''}
        </span>
        {slide.status === 'failed' && slide.error_message && (
          <span className="slide-card__error">{slide.error_message}</span>
        )}
      </div>
    </>
  );

  return slide.status === 'ready' ? (
    <Link to={`/slides/${slide.id}`} className="slide-card slide-card--link">
      {content}
    </Link>
  ) : (
    <div className="slide-card">{content}</div>
  );
}
