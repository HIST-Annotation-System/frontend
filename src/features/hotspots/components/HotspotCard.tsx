import { Check, Image as ImageIcon, PanelRight, PencilLine, PenTool, Scissors, Star } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { Link } from 'react-router-dom';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotSort } from '../../../types/hotspot';
import type { HotspotMode } from '../utils/hotspotReview';
import HotspotSource from './HotspotSource';
import HotspotStats from './HotspotStats';
import HotspotTagChips from './HotspotTagChips';
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
  detailsOpen?: boolean;
  onShowDetails?: () => void;
}

/** A hotspot of the assess/reannotate queues; managing hotspots happens in the browse table. */
export default function HotspotCard({
  hotspot,
  mode,
  sort,
  linkSearch,
  selected,
  onToggleSelect,
  detailsOpen = false,
  onShowDetails,
}: HotspotCardProps) {
  const reannotating = mode === 'reannotate';
  const link = `/hotspots/${hotspot.id}${linkSearch}`;

  return (
    <div className={`hotspot-card${selected ? ' hotspot-card--selected' : ''}${detailsOpen ? ' hotspot-card--details' : ''}`}>
      <Link to={link} className="hotspot-card__thumb" aria-label={`Otwórz hotspot ${hotspot.name}`} title="Otwórz do anotacji">
        <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
        <span className="hotspot-card__overlay hotspot-card__overlay--count" title="Anotacje">
          <PenTool size={11} aria-hidden="true" />
          {hotspot.annotation_count}
        </span>
        {hotspot.reannotated_at && (
          <span className="hotspot-card__corrected">
            <Check size={12} aria-hidden="true" />
            Poprawione
          </span>
        )}
        {reannotating && (
          <span className="hotspot-card__overlay hotspot-card__overlay--score" title="Wynik tagów (suma wag)">
            wynik {hotspot.score}
          </span>
        )}
      </Link>
      <label className="hotspot-card__select" title="Zaznacz">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Zaznacz hotspot ${hotspot.name}`}
          onChange={onToggleSelect}
        />
        <span className="hotspot-card__select-box" aria-hidden="true">
          {selected && <Check size={14} />}
        </span>
      </label>
      <div className="hotspot-card__body">
        <span className="hotspot-card__title">
          <span className="hotspot-card__name" title={hotspot.name}>
            {hotspot.name}
          </span>
          {onShowDetails && (
            <Button
              variant="ghost"
              active={detailsOpen}
              icon={<PanelRight size={14} />}
              title="Szczegóły"
              aria-label={`Szczegóły hotspotu ${hotspot.name}`}
              onClick={onShowDetails}
            />
          )}
        </span>
        <span className="hotspot-card__source" title={hotspot.slide_name ?? undefined}>
          {hotspot.slide_name === null ? (
            <ImageIcon size={13} aria-hidden="true" />
          ) : (
            <Scissors size={13} aria-hidden="true" />
          )}
          <span className="hotspot-card__source-text">
            <HotspotSource hotspot={hotspot} />
          </span>
        </span>
        <HotspotStats hotspot={hotspot} sort={sort} />
        {reannotating && (
          <>
            <HotspotTagChips hotspot={hotspot} />
            {hotspot.assessed_by && <span className="hotspot-card__assessor">Ocenił: {hotspot.assessed_by}</span>}
          </>
        )}
        <Link to={link} className="hotspot-card__action">
          {reannotating ? <PencilLine size={14} aria-hidden="true" /> : <Star size={14} aria-hidden="true" />}
          {reannotating ? 'Reannotuj' : 'Oceń'}
        </Link>
      </div>
    </div>
  );
}
