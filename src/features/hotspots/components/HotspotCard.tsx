import { Link, useNavigate } from 'react-router-dom';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot } from '../../../types/hotspot';
import type { HotspotMode } from '../utils/hotspotReview';
import { isRowControl } from '../utils/rowClick';
import { useTags } from '../hooks/useTags';
import { TAG_DIMENSIONS } from '../utils/hotspotTags';
import { CustomTagPills, VerdictMark } from './TagMarks';
import './Hotspots.css';

interface HotspotCardProps {
  hotspot: Hotspot;
  /** Names what the card's link does (assess or reannotate); the numbers are in the details panel. */
  mode: HotspotMode;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  selected: boolean;
  onToggleSelect: () => void;
  /** The verdict and tag lines; left out when no card on the page has anything to show in them. */
  tagLines?: boolean;
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
  tagLines = true,
  detailsOpen = false,
  onShowDetails,
}: HotspotCardProps) {
  const navigate = useNavigate();
  const reannotating = mode === 'reannotate';
  const { data: allTags = [] } = useTags();
  const verdicts = TAG_DIMENSIONS.flatMap(({ value }) => hotspot.tags.filter((tag) => tag.dimension === value));
  const custom = hotspot.tags.filter((tag) => tag.dimension === null);
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
        {/* On the thumbnail, so it never competes with the tags for room. */}
        {hotspot.reannotated_at && <span className="hotspot-card__corrected">Poprawione</span>}
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
      {/* Two lines of fixed height, filled or not, so every card in the grid is as tall as the others. */}
      {tagLines && (
        <>
          <div className="hotspot-card__line">
            {verdicts.map((tag) => (
              <VerdictMark key={tag.id} tag={tag} allTags={allTags} labelled size={14} />
            ))}
          </div>
          <div className="hotspot-card__line">
            <CustomTagPills tags={custom} max={1} />
          </div>
        </>
      )}
    </div>
  );
}
