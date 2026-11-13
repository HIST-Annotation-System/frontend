import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { LayoutGrid, List, Microscope, SearchX, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadProvider';
import OrganizationSelect from '../features/organizations/components/OrganizationSelect';
import { useOrganizations } from '../features/organizations/hooks/useOrganizations';
import PaneHandle from '../features/viewer/components/PaneHandle';
import SlideGrid from '../features/slides/components/SlideGrid';
import SlidePreview from '../features/slides/components/SlidePreview';
import SlideTable from '../features/slides/components/SlideTable';
import { useSlides } from '../features/slides/hooks/useSlides';
import { sortSlides, type SlideSort } from '../features/slides/utils/slideSort';
import InterruptedUploads from '../features/upload/components/InterruptedUploads';
import UploadQueueList from '../features/upload/components/UploadQueueList';
import WsiUploader from '../features/upload/components/WsiUploader';
import type { Slide } from '../types/slide';
import { getErrorMessage } from '../utils/errors';
import { isManager } from '../utils/roles';
import './SlidesPage.css';

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

type LibraryView = 'tiles' | 'table';
const VIEW_KEY = 'hist.slideLibraryView';

function readView(): LibraryView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'tiles';
  } catch {
    return 'tiles';
  }
}

type StatusFilter = 'all' | 'ready' | 'pending' | 'failed';

const STATUS_FILTERS: { value: StatusFilter; label: string; matches: (status: Slide['status']) => boolean }[] = [
  { value: 'all', label: 'Wszystkie', matches: () => true },
  { value: 'ready', label: 'Gotowe', matches: (status) => status === 'ready' },
  { value: 'pending', label: 'W toku', matches: (status) => status === 'uploading' || status === 'processing' },
  { value: 'failed', label: 'Błędy', matches: (status) => status === 'failed' },
];

const PANEL_KEY = 'hist.slideLibraryPanel';

function readPanelOpen(): boolean {
  try {
    const saved = localStorage.getItem(PANEL_KEY);
    if (saved) return saved === 'open';
  } catch {
    // Falls back to the width.
  }
  return window.innerWidth >= 1100;
}

const SORT_OPTIONS: { value: string; label: string; sort: SlideSort }[] = [
  { value: '', label: 'Najnowsze', sort: null },
  { value: 'created_at-asc', label: 'Najstarsze', sort: { key: 'created_at', descending: false } },
  { value: 'name-asc', label: 'Nazwa A–Z', sort: { key: 'name', descending: false } },
  { value: 'name-desc', label: 'Nazwa Z–A', sort: { key: 'name', descending: true } },
];

/** The select's value; newest first is the server's order whether it came from the select or a table header. */
const SORT_KEY = 'hist.slideLibrarySort';

function readSort(): SlideSort {
  try {
    return SORT_OPTIONS.find((option) => option.value === localStorage.getItem(SORT_KEY))?.sort ?? null;
  } catch {
    return null;
  }
}

const sortValue = (sort: SlideSort) =>
  !sort || (sort.key === 'created_at' && sort.descending) ? '' : `${sort.key}-${sort.descending ? 'desc' : 'asc'}`;

/** The slide library: tiles (or a table) of slides with the selected one in the preview panel; admins add slides here. */
export default function SlidesPage() {
  useDocumentTitle('Slajdy');
  const { user } = useAuth();
  // Adding slides is an administrator task (the upload API enforces it too).
  const isAdmin = isManager(user);
  const { enqueue: addToQueue, items: uploads } = useUpload();
  const { organizations, needsChoice } = useOrganizations();
  const [chosenOrganizationId, setChosenOrganizationId] = useState<number | null>(null);
  const uploadOrganizationId = needsChoice
    ? (organizations.find((organization) => organization.id === chosenOrganizationId) ?? organizations[0]).id
    : null;
  const enqueue = (files: Iterable<File>) => addToQueue(files, uploadOrganizationId);
  const { data, isPending, error } = useSlides();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const setQuery = (next: string) =>
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next) updated.set('q', next);
      else updated.delete('q');
      return updated;
    }, { replace: true });
  const searchInput = useRef<HTMLInputElement>(null);
  const pickFiles = useRef<(() => void) | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView] = useState<LibraryView>(readView);
  const [sort, setSortState] = useState<SlideSort>(readSort);

  useSearchShortcut(searchInput);

  const needle = query.trim().toLowerCase();
  const matching = (data ?? []).filter(
    (slide) => !needle || slide.name.toLowerCase().includes(needle) || slide.original_filename.toLowerCase().includes(needle),
  );
  const countOf = (filter: (typeof STATUS_FILTERS)[number]) => matching.filter((slide) => filter.matches(slide.status)).length;
  const activeFilter = STATUS_FILTERS.find((filter) => filter.value === statusFilter) ?? STATUS_FILTERS[0];
  const slides = sortSlides(matching.filter((slide) => activeFilter.matches(slide.status)), sort);
  const filtered = needle !== '' || statusFilter !== 'all';

  const setSort = (next: SlideSort) => {
    setSortState(next);
    try {
      localStorage.setItem(SORT_KEY, sortValue(next));
    } catch {
      // Not remembered, still works for this visit.
    }
  };

  const changeView = (next: LibraryView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembered, still works for this visit.
    }
  };
  const togglePanel = () => {
    setPanelOpen(!panelOpen);
    try {
      localStorage.setItem(PANEL_KEY, panelOpen ? 'closed' : 'open');
    } catch {
      // Not remembered, still works for this visit.
    }
  };
  const selected = slides.find((slide) => slide.id === selectedId) ?? slides[0];

  const dropHandlers = isAdmin
    ? {
        onDragOver: (event: DragEvent) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setIsDragging(true);
        },
        onDragLeave: (event: DragEvent) => {
          // Leaving for a child element is not leaving the page.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          setIsDragging(false);
          enqueue(event.dataTransfer.files);
        },
      }
    : {};

  return (
    <div className="slides-page tone-soft" {...dropHandlers}>
      <section className="slides-page__main">
        <header className="slides-page__header">
          <h1 className="slides-page__title">
            Slajdy
            {data && (
              <span className="slides-page__count">{filtered ? `${slides.length} z ${data.length}` : data.length}</span>
            )}
          </h1>
          <label className="search-field">
            <input
              ref={searchInput}
              type="search"
              placeholder="Szukaj nazwy  ( / )"
              aria-label="Szukaj slajdu"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setQuery('');
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
          <span className="slides-page__spacer" />
          <div className="segmented" role="group" aria-label="Widok">
            {(
              [
                ['tiles', 'Kafelki', LayoutGrid],
                ['table', 'Tabela', List],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                className={`segmented__option segmented__option--icon${view === value ? ' segmented__option--active' : ''}`}
                aria-pressed={view === value}
                aria-label={label}
                title={label}
                onClick={() => changeView(value)}
              >
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
          <select
            className={`slides-page__sort${statusFilter !== 'all' ? ' slides-page__sort--active' : ''}`}
            aria-label="Stan slajdów"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            {STATUS_FILTERS.map((filter) => {
              const count = filter.value === 'all' ? 0 : countOf(filter);
              return (
                <option key={filter.value} value={filter.value}>
                  {filter.value === 'all' ? 'Wszystkie stany' : filter.label}
                  {filter.value !== 'ready' && count > 0 ? ` (${count})` : ''}
                </option>
              );
            })}
          </select>
          {/* The table's headers set the order there. */}
          {view === 'tiles' && (
            <select
              className="slides-page__sort"
              aria-label="Kolejność"
              value={sortValue(sort)}
              onChange={(event) =>
                setSort(SORT_OPTIONS.find((option) => option.value === event.target.value)?.sort ?? null)
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {isAdmin && (
            <WsiUploader
              onFiles={enqueue}
              pickerRef={pickFiles}
              organizationPicker={
                needsChoice && (
                  <OrganizationSelect
                    organizations={organizations}
                    value={uploadOrganizationId}
                    onChange={setChosenOrganizationId}
                  />
                )
              }
            />
          )}
        </header>
        {/* A failed background refresh keeps the last list on screen; only a failed first load replaces it. */}
        {error && data && (
          <p className="slides-page__stale" role="status">
            Nie udało się odświeżyć listy - pokazano ostatni stan. Ponowna próba za chwilę.
          </p>
        )}
        <div className="slides-page__scroll">
          {isPending ? (
            <ul className="slide-grid" aria-busy="true" aria-label="Wczytywanie slajdów…">
              {Array.from({ length: 8 }, (_, index) => (
                <li key={index} className="slide-tile slide-tile--skeleton" aria-hidden="true">
                  <span className="slide-tile__image" />
                  <span className="slide-tile__line" />
                  <span className="slide-tile__line slide-tile__line--short" />
                </li>
              ))}
            </ul>
          ) : !data ? (
            <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać listy slajdów.')} />
          ) : slides.length === 0 ? (
            <div className="slides-page__empty">
              {filtered ? <SearchX size={32} aria-hidden="true" /> : <Microscope size={32} aria-hidden="true" />}
              <p className="slides-page__empty-title">
                {filtered ? 'Żaden slajd nie pasuje do filtrów' : 'Biblioteka jest pusta'}
              </p>
              <p>
                {filtered
                  ? 'Zmień wyszukiwanie albo stan slajdów.'
                  : isAdmin
                    ? 'Wgraj pierwsze pliki albo upuść je na tę stronę.'
                    : 'Slajdy dodają administratorzy.'}
              </p>
              {filtered ? (
                <Button
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Wyczyść filtry
                </Button>
              ) : (
                isAdmin && (
                  <Button
                    variant="primary"
                    icon={<Upload size={16} aria-hidden="true" />}
                    onClick={() => pickFiles.current?.()}
                  >
                    Wgraj slajd
                  </Button>
                )
              )}
            </div>
          ) : view === 'tiles' ? (
            <SlideGrid slides={slides} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          ) : (
            <SlideTable
              slides={slides}
              sort={sort}
              onSortChange={setSort}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          )}
          {isAdmin && (
            <div className="slides-page__uploads">
              <InterruptedUploads />
              {uploads.length > 0 && <UploadQueueList />}
            </div>
          )}
        </div>
      </section>
      {selected && <PaneHandle open={panelOpen} onToggle={togglePanel} label="Podgląd" />}
      {selected && panelOpen && (
        <aside className="side-pane" aria-label="Podgląd slajdu">
          <SlidePreview key={selected.id} slide={selected} />
        </aside>
      )}
      {isDragging && (
        <div className="slides-page__drop" aria-hidden="true">
          <p>
            <strong>Upuść pliki, aby wgrać slajdy</strong>
            <span>Formaty wieloplikowe jako archiwum .zip</span>
          </p>
        </div>
      )}
    </div>
  );
}
