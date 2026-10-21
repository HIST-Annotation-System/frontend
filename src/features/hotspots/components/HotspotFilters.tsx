import type { HotspotStatus } from '../../../types/hotspot';
import { HOTSPOT_STATUS_OPTIONS, type HotspotMode } from '../utils/hotspotReview';
import HotspotTagFilter from './HotspotTagFilter';
import './Hotspots.css';

interface HotspotFiltersProps {
  /** Reannotating only tells the queue apart from the finished ones. */
  mode: HotspotMode;
  status: HotspotStatus | null;
  tagIds: number[];
  onChange: (changes: { status?: HotspotStatus | null; tagIds?: number[] }) => void;
}

/** Narrows the catalog by review status and by tags (a hotspot must carry every ticked tag). */
export default function HotspotFilters({ mode, status, tagIds, onChange }: HotspotFiltersProps) {
  const statuses = HOTSPOT_STATUS_OPTIONS.filter((option) => mode !== 'reannotate' || option.value !== 'untagged');

  return (
    <div className="hotspot-filters">
      <select
        className="field"
        aria-label="Stan oceny"
        value={status ?? ''}
        onChange={(event) => onChange({ status: (event.target.value || null) as HotspotStatus | null })}
      >
        <option value="">Każdy stan</option>
        {statuses.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <HotspotTagFilter tagIds={tagIds} onChange={(next) => onChange({ tagIds: next })} />
    </div>
  );
}
