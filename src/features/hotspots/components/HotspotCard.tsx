import { Link } from 'react-router-dom';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotSort } from '../../../types/hotspot';
import { useTags } from '../hooks/useTags';
import type { HotspotMode } from '../utils/hotspotReview';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TagText } from './HotspotTable';
import './Hotspots.css';

interface HotspotCardProps {
  hotspot: Hotspot;
  /** Assessing shows what helps pick a hotspot (no tags); reannotating also shows the expert's verdict. */
  mode: HotspotMode;
  /** The catalog's order; that stat is shown. */
  sort: HotspotSort;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  selected: boolean;
  onToggleSelect: () => void;
}

/** A contact-sheet tile of the assess/reannotate queues; managing hotspots happens in the browse table. */
export default function HotspotCard({ hotspot, mode, sort, linkSearch, selected, onToggleSelect }: HotspotCardProps) {
  const { data: allTags = [] } = useTags();
  const reannotating = mode === 'reannotate';
  const feature = HOTSPOT_FEATURES.find((item) => item.value === sort);
  const featureValue = feature ? hotspot.features?.[feature.value] : undefined;

  return (
    <div className={`hotspot-tile${selected ? ' hotspot-tile--selected' : ''}`}>
      <Link to={`/hotspots/${hotspot.id}${linkSearch}`} className="hotspot-tile__image" aria-label={`Otwórz hotspot ${hotspot.name}`}>
        <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
      </Link>
      <label className="hotspot-tile__name" title={hotspot.name}>
        <input type="checkbox" checked={selected} aria-label={`Zaznacz hotspot ${hotspot.name}`} onChange={onToggleSelect} />
        <span>{hotspot.name}</span>
      </label>
      <span className="hotspot-tile__meta">
        {reannotating ? (
          <>
            Wynik <span className="tabular">{hotspot.score}</span> ·{' '}
            <TagText tags={hotspot.tags.filter((tag) => tag.dimension !== null)} allTags={allTags} />
          </>
        ) : feature ? (
          <>
            {feature.shortLabel} <span className="tabular">{featureValue === undefined ? '—' : featureValue.toFixed(2)}</span>
          </>
        ) : (
          <>
            Anotacje <span className="tabular">{hotspot.annotation_count}</span>
          </>
        )}
      </span>
    </div>
  );
}
