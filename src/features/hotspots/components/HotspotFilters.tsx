import type { HotspotStatus } from '../../../types/hotspot';
import { HOTSPOT_STATUS_OPTIONS, MIN_RATINGS, type HotspotMode } from '../utils/hotspotReview';
import HotspotTagFilter from './HotspotTagFilter';
import './Hotspots.css';

interface HotspotFiltersProps {
  /** Reannotating only tells the queue apart from the finished ones. */
  mode: HotspotMode;
  status: HotspotStatus | null;
  tagIds: number[];
  ratingCount: number | undefined;
  onChange: (changes: { status?: HotspotStatus | null; tagIds?: number[]; ratingCount?: number }) => void;
}

const RATING_COUNTS = Array.from({ length: MIN_RATINGS + 3 }, (_, count) => count);

interface RatingCountFilterProps {
  value: number | undefined;
  onChange: (ratingCount: number | undefined) => void;
}

export function RatingCountFilter({ value, onChange }: RatingCountFilterProps) {
  return (
    <select
      className="hotspot-sort__select"
      aria-label="Liczba ocen"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
    >
      <option value="">Dowolna liczba ocen</option>
      {RATING_COUNTS.map((count) => (
        <option key={count} value={count}>
          Ocen: {count}
        </option>
      ))}
    </select>
  );
}

/** Narrows the catalog by review status, number of ratings and tags (a hotspot must carry every ticked tag). */
export default function HotspotFilters({ mode, status, tagIds, ratingCount, onChange }: HotspotFiltersProps) {
  const statuses = HOTSPOT_STATUS_OPTIONS.filter((option) => mode !== 'reannotate' || option.value !== 'untagged');

  return (
    <div className="hotspot-filters">
      <select
        className="hotspot-sort__select"
        aria-label="Status oceny"
        value={status ?? ''}
        onChange={(event) => onChange({ status: (event.target.value || null) as HotspotStatus | null })}
      >
        <option value="">Wszystkie statusy</option>
        {statuses.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <RatingCountFilter value={ratingCount} onChange={(next) => onChange({ ratingCount: next })} />
      <HotspotTagFilter tagIds={tagIds} onChange={(next) => onChange({ tagIds: next })} />
    </div>
  );
}
