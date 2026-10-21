import { useState } from 'react';
import { Search } from 'lucide-react';
import type { CellType } from '../../../types/cellType';
import { FALLBACK_CELL_TYPE_COLOR } from '../utils/cellTypeColors';
import './CellTypeSelector.css';

const RECENT_MAX = 5;

interface CellTypeSelectorProps {
  cellTypes: CellType[];
  activeCellTypeId: number | null;
  colorMap: ReadonlyMap<number, string>;
  onSelect: (cellTypeId: number) => void;
  /** Outlines per cell type, shown at the end of each row. */
  counts?: ReadonlyMap<number, number>;
}

/** Cell type picker of the viewer panel: search, recently used chips and the full (scrolling) list. */
export default function CellTypeSelector({
  cellTypes,
  activeCellTypeId,
  colorMap,
  onSelect,
  counts,
}: CellTypeSelectorProps) {
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<number[]>([]);

  const handleSelect = (id: number) => {
    onSelect(id);
    setRecentIds((prev) => [id, ...prev.filter((r) => r !== id)].slice(0, RECENT_MAX));
  };

  const lowerQuery = query.toLowerCase();
  const filtered = cellTypes.filter((ct) => ct.name.toLowerCase().includes(lowerQuery));

  const recentTypes = recentIds
    .map((id) => cellTypes.find((ct) => ct.id === id))
    .filter(Boolean) as CellType[];
  const colorOf = (id: number) => colorMap.get(id) ?? FALLBACK_CELL_TYPE_COLOR;

  return (
    <div className="cts">
      <div className="cts-search">
        <Search size={15} className="cts-search__icon" aria-hidden="true" />
        <input
          id="cell-type-search-input"
          type="text"
          className="cts-search__input"
          placeholder="Szukaj typu komórki…"
          aria-label="Szukaj typu komórki"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Recently used: only when not searching */}
      {!query && recentTypes.length > 0 && (
        <>
          <span className="cts-caption">Ostatnio używane</span>
          <div className="cts-recent">
            {recentTypes.map((ct) => (
              <button
                key={ct.id}
                type="button"
                className={`cts-chip${ct.id === activeCellTypeId ? ' cts-chip--active' : ''}`}
                aria-pressed={ct.id === activeCellTypeId}
                onClick={() => handleSelect(ct.id)}
              >
                <span className="cts-swatch cts-swatch--sm" style={{ background: colorOf(ct.id) }} aria-hidden="true" />
                {ct.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="cts-list" role="listbox" aria-label="Typ komórki">
        {filtered.length === 0 ? (
          <p className="cts-empty">Brak typu „{query}”.</p>
        ) : (
          filtered.map((ct) => (
            <button
              key={ct.id}
              type="button"
              role="option"
              aria-selected={ct.id === activeCellTypeId}
              className={`cts-option${ct.id === activeCellTypeId ? ' cts-option--active' : ''}`}
              onClick={() => handleSelect(ct.id)}
            >
              <span className="cts-swatch" style={{ background: colorOf(ct.id) }} aria-hidden="true" />
              <span className="cts-option__name">{ct.name}</span>
              {counts && <span className="cts-option__count">{counts.get(ct.id) ?? 0}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
