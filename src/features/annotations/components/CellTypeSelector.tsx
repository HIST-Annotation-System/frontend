import { useRef, useState } from 'react';
import { useDismiss } from '../../../hooks/useDismiss';
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

/**
 * Cell type picker of the viewer panel: a compact field with the active type; it opens search, recently used chips
 * and the full (scrolling) list with outline counts. Choosing a type, Esc or a click outside closes it.
 */
export default function CellTypeSelector({
  cellTypes,
  activeCellTypeId,
  colorMap,
  onSelect,
  counts,
}: CellTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  useDismiss(open, containerRef, close);

  const handleSelect = (id: number) => {
    onSelect(id);
    setRecentIds((prev) => [id, ...prev.filter((r) => r !== id)].slice(0, RECENT_MAX));
    close();
  };
  const active = cellTypes.find((ct) => ct.id === activeCellTypeId) ?? null;

  const lowerQuery = query.toLowerCase();
  const filtered = cellTypes.filter((ct) => ct.name.toLowerCase().includes(lowerQuery));

  const recentTypes = recentIds
    .map((id) => cellTypes.find((ct) => ct.id === id))
    .filter(Boolean) as CellType[];
  const colorOf = (id: number) => colorMap.get(id) ?? FALLBACK_CELL_TYPE_COLOR;

  return (
    <div className="cts" ref={containerRef}>
      <button
        type="button"
        className="cts-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {active && <span className="cts-swatch" style={{ background: colorOf(active.id) }} aria-hidden="true" />}
        <span className="cts-trigger__label">{active ? active.name : 'Wybierz typ komórki…'}</span>
        <span className="cts-trigger__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="cts-dropdown">
          <div className="cts-search">
            <input
              type="text"
              className="cts-search__input"
              placeholder="Szukaj typu komórki…"
              aria-label="Szukaj typu komórki"
              autoFocus
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
      )}
    </div>
  );
}
