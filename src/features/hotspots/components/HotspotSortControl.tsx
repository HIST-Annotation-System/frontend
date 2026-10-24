import { ArrowDown, ArrowUp } from 'lucide-react';
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

/** Orders the catalog by date, an image feature or the tags; the arrow flips descending (down) and ascending (up). */
export default function HotspotSortControl({ options, sort, order, onChange }: HotspotSortControlProps) {
  const selected = options.find((option) => option.value === sort);

  return (
    <div className="hotspot-sort">
      <span className="hotspot-sort__label">Sortuj według</span>
      <select
        className="hotspot-sort__select"
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
        icon={order === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
        title={order === 'desc' ? 'Malejąco' : 'Rosnąco'}
        aria-label={`Kierunek sortowania: ${order === 'desc' ? 'malejąco' : 'rosnąco'}`}
        onClick={() => onChange(sort, order === 'desc' ? 'asc' : 'desc')}
      />
    </div>
  );
}
