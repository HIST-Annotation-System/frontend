import { Link } from 'react-router-dom';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotSort } from '../../../types/hotspot';
import type { HotspotMode } from '../utils/hotspotReview';
import HotspotSource from './HotspotSource';
import HotspotStats from './HotspotStats';
import HotspotTagChips from './HotspotTagChips';
import '../../slides/components/SlideList.css';
import './Hotspots.css';

interface HotspotCardProps {
  hotspot: Hotspot;
  /** Assessing shows what helps pick a hotspot (no tags); reannotating also shows the expert's verdict. */
  mode: HotspotMode;
  /** The catalog's order; that stat is emphasised. */
  sort: HotspotSort;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  selected: boolean;
  onToggleSelect: () => void;
}

/** A hotspot of the assess/reannotate queues; managing hotspots happens in the browse table. */
export default function HotspotCard({ hotspot, mode, sort, linkSearch, selected, onToggleSelect }: HotspotCardProps) {
  const reannotating = mode === 'reannotate';

  return (
    <div className={`slide-card${selected ? ' hotspot-card--selected' : ''}`}>
      <Link to={`/hotspots/${hotspot.id}${linkSearch}`} className="slide-card__thumbnail" aria-label={`Otwórz hotspot ${hotspot.name}`}>
        <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
      </Link>
      <div className="slide-card__body">
        <div className="slide-card__title-row">
          <input
            type="checkbox"
            className="hotspot-card__select"
            checked={selected}
            aria-label={`Zaznacz hotspot ${hotspot.name}`}
            onChange={onToggleSelect}
          />
          <span className="slide-card__name" title={hotspot.name}>
            {hotspot.name}
          </span>
          {reannotating && (
            <span className="hotspot-card__score mono-data" title="Wynik tagów (suma wag)">
              {hotspot.score}
            </span>
          )}
        </div>
        <span className="slide-card__meta" title={hotspot.slide_name ?? undefined}>
          <HotspotSource hotspot={hotspot} />
        </span>
        {reannotating && (
          <>
            <HotspotTagChips hotspot={hotspot} />
            {hotspot.assessed_by && <span className="slide-card__meta">Ocenił: {hotspot.assessed_by}</span>}
          </>
        )}
        <HotspotStats hotspot={hotspot} sort={sort} />
        <span className="slide-card__meta">
          Anotacje: <span className="mono-data">{hotspot.annotation_count}</span>
        </span>
      </div>
    </div>
  );
}
