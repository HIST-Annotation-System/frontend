import { Link, useNavigate } from 'react-router-dom';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot } from '../../../types/hotspot';
import type { HotspotMode } from '../utils/hotspotReview';
import { isRowControl } from '../utils/rowClick';
import HotspotTagChips from './HotspotTagChips';
import './Hotspots.css';

interface HotspotCardProps {
  hotspot: Hotspot;
  /** Reannotating also shows the expert's verdict; the numbers are in the details panel. */
  mode: HotspotMode;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  selected: boolean;
  onToggleSelect: () => void;
  detailsOpen?: boolean;
  onShowDetails?: () => void;
}

/**
 * A hotspot of the assess/reannotate queues; managing hotspots happens in the browse table. The name opens it for
 * assessing (or reannotating), as does a double click; a click anywhere else (or Enter) shows it in the details
 * panel.
 */
export default function HotspotCard({
  hotspot,
  mode,
  linkSearch,
  selected,
  onToggleSelect,
  detailsOpen = false,
  onShowDetails,
}: HotspotCardProps) {
  const navigate = useNavigate();
  const reannotating = mode === 'reannotate';
  const link = `/hotspots/${hotspot.id}${linkSearch}`;

  return (
    <div
      className={`hotspot-card${detailsOpen ? ' hotspot-card--details' : ''}`}
      tabIndex={onShowDetails ? 0 : undefined}
      onClick={(event) => {
        if (onShowDetails && !isRowControl(event)) onShowDetails();
      }}
      onDoubleClick={(event) => {
        if (!isRowControl(event)) navigate(link);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onShowDetails?.();
      }}
    >
      <div className="hotspot-card__thumb">
        <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
      </div>
      <div className="hotspot-card__title">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Zaznacz hotspot ${hotspot.name}`}
          onChange={onToggleSelect}
        />
        <Link to={link} className="hotspot-card__name" title={`${reannotating ? 'Reannotuj' : 'Oceń'}: ${hotspot.name}`}>
          {hotspot.name}
        </Link>
      </div>
      {hotspot.reannotated_at && <span className="hotspot-card__corrected">Poprawione</span>}
      {reannotating && <HotspotTagChips hotspot={hotspot} />}
    </div>
  );
}
