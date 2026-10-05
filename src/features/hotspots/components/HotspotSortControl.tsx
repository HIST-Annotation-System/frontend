import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { HotspotSort, SortOrder } from '../../../types/hotspot';
import { HOTSPOT_SORT_OPTIONS } from '../utils/hotspotSort';
import './Hotspots.css';

interface HotspotSortControlProps {
  sort: HotspotSort;
  order: SortOrder;
  onChange: (sort: HotspotSort, order: SortOrder) => void;
}

/** Orders a folder's hotspots by date or by an image feature, ascending or descending. */
export default function HotspotSortControl({ sort, order, onChange }: HotspotSortControlProps) {
  const selected = HOTSPOT_SORT_OPTIONS.find((option) => option.value === sort);
  const descending = order === 'desc';

  return (
    <div className="hotspot-sort">
      <select
        className="hotspot-sort__select"
        aria-label="Sortuj według"
        title={selected?.description}
        value={sort}
        onChange={(event) => onChange(event.target.value as HotspotSort, order)}
      >
        {HOTSPOT_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} title={option.description}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        icon={descending ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}
        title={descending ? 'Malejąco' : 'Rosnąco'}
        aria-label={descending ? 'Sortowanie malejące, zmień na rosnące' : 'Sortowanie rosnące, zmień na malejące'}
        onClick={() => onChange(sort, descending ? 'asc' : 'desc')}
      />
    </div>
  );
}
