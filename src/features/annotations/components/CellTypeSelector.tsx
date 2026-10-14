import { useEffect, useRef, useState } from 'react';
import { Search, Clock, ChevronDown } from 'lucide-react';
import type { CellType } from '../../../types/cellType';
import './CellTypeSelector.css';

const RECENT_MAX = 5;

interface CellTypeSelectorProps {
  cellTypes: CellType[];
  activeCellTypeId: number | null;
  colorMap: ReadonlyMap<number, string>;
  onSelect: (cellTypeId: number) => void;
}

export default function CellTypeSelector({
  cellTypes,
  activeCellTypeId,
  colorMap,
  onSelect,
}: CellTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCellType = cellTypes.find((ct) => ct.id === activeCellTypeId) ?? null;
  const activeColor = activeCellTypeId != null ? (colorMap.get(activeCellTypeId) ?? '#94a3b8') : '#94a3b8';

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = (id: number) => {
    onSelect(id);
    setRecentIds((prev) => [id, ...prev.filter((r) => r !== id)].slice(0, RECENT_MAX));
    setOpen(false);
    setQuery('');
  };

  const lowerQuery = query.toLowerCase();
  const filtered = cellTypes.filter((ct) => ct.name.toLowerCase().includes(lowerQuery));

  const recentTypes = recentIds
    .map((id) => cellTypes.find((ct) => ct.id === id))
    .filter(Boolean) as CellType[];

  return (
    <div className="cts-container" ref={containerRef}>
      {/* Trigger button */}
      <button
        id="cell-type-selector-trigger"
        type="button"
        className="cts-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="cts-trigger__swatch"
          style={{ background: activeColor }}
          aria-hidden="true"
        />
        <span className="cts-trigger__label">
          {activeCellType ? activeCellType.name : 'Wybierz typ komórki…'}
        </span>
        <ChevronDown size={14} className={`cts-trigger__chevron${open ? ' cts-trigger__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="cts-dropdown" role="dialog" aria-label="Wybierz typ komórki">
          {/* Search */}
          <div className="cts-search">
            <Search size={14} className="cts-search__icon" aria-hidden="true" />
            <input
              ref={inputRef}
              id="cell-type-search-input"
              type="text"
              className="cts-search__input"
              placeholder="Szukaj typu komórki…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="cts-list-scroll">
            {/* Recently used — only when no search query */}
            {!query && recentTypes.length > 0 && (
              <section className="cts-section">
                <div className="cts-section__label">
                  <Clock size={11} aria-hidden="true" />
                  Ostatnio używane
                </div>
                {recentTypes.map((ct) => (
                  <CellTypeOption
                    key={ct.id}
                    cellType={ct}
                    color={colorMap.get(ct.id) ?? '#94a3b8'}
                    active={ct.id === activeCellTypeId}
                    onSelect={handleSelect}
                  />
                ))}
              </section>
            )}

            {/* Full / filtered list */}
            <section className="cts-section">
              {(query || recentTypes.length > 0) && (
                <div className="cts-section__label">Wszystkie typy</div>
              )}
              {filtered.length === 0 ? (
                <p className="cts-empty">Brak wyników dla „{query}"</p>
              ) : (
                filtered.map((ct) => (
                  <CellTypeOption
                    key={ct.id}
                    cellType={ct}
                    color={colorMap.get(ct.id) ?? '#94a3b8'}
                    active={ct.id === activeCellTypeId}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

interface CellTypeOptionProps {
  cellType: CellType;
  color: string;
  active: boolean;
  onSelect: (id: number) => void;
}

function CellTypeOption({ cellType, color, active, onSelect }: CellTypeOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`cts-option${active ? ' cts-option--active' : ''}`}
      onClick={() => onSelect(cellType.id)}
    >
      <span className="cts-option__swatch" style={{ background: color }} aria-hidden="true" />
      <span className="cts-option__name">{cellType.name}</span>
    </button>
  );
}
