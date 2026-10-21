import Button from '../../../components/ui/Button';
import type { HotspotSort, SortOrder } from '../../../types/hotspot';
import type { HotspotSortOption } from '../utils/hotspotSort';
import './Hotspots.css';

interface HotspotSortControlProps {
  /** The orders this mode offers. */
  options: HotspotSortOption[];
  sort: HotspotSort;
  order: SortOrder;
  onChange: (sort: HotspotSort, order: SortOrder) => void;
}

/** Orders the catalog by date, an image feature or the tags, ascending or descending. */
export default function HotspotSortControl({ options, sort, order, onChange }: HotspotSortControlProps) {
  const selected = options.find((option) => option.value === sort);
  const descending = order === 'desc';

  return (
    <div className="hotspot-sort">
      <select
        className="field"
        aria-label="Sortuj według"
        title={selected?.description}
        value={sort}
        onChange={(event) => onChange(event.target.value as HotspotSort, order)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} title={option.description}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        title={descending ? 'Sortowanie malejące, zmień na rosnące' : 'Sortowanie rosnące, zmień na malejące'}
        onClick={() => onChange(sort, descending ? 'asc' : 'desc')}
      >
        {descending ? 'Malejąco ↓' : 'Rosnąco ↑'}
      </Button>
    </div>
  );
}
