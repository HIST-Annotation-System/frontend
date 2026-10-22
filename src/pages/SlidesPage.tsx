import { useState, type DragEvent } from 'react';
import ErrorMessage from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadProvider';
import SlideGrid from '../features/slides/components/SlideGrid';
import SlidePreview from '../features/slides/components/SlidePreview';
import SlideTable from '../features/slides/components/SlideTable';
import { useSlides } from '../features/slides/hooks/useSlides';
import { sortSlides, type SlideSort } from '../features/slides/utils/slideSort';
import InterruptedUploads from '../features/upload/components/InterruptedUploads';
import UploadQueueList from '../features/upload/components/UploadQueueList';
import WsiUploader from '../features/upload/components/WsiUploader';
import { getErrorMessage } from '../utils/errors';
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
  const { user } = useAuth();
  // Adding slides is an administrator task (the upload API enforces it too).
  const isAdmin = user?.role === 'ADMIN';
  const { enqueue, items: uploads } = useUpload();
  const { data, isPending, error } = useSlides();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView] = useState<LibraryView>(readView);
  const [sort, setSortState] = useState<SlideSort>(readSort);

  const needle = query.trim().toLowerCase();
  const slides = sortSlides(
    (data ?? []).filter(
      (slide) => !needle || slide.name.toLowerCase().includes(needle) || slide.original_filename.toLowerCase().includes(needle),
    ),
    sort,
  );

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
      <section className="slides-page__main" aria-label="Slajdy">
        <header className="slides-page__header">
          <h1 className="slides-page__title">
            Biblioteka slajdów
            {data && <span className="slides-page__count">{data.length}</span>}
          </h1>
          {isAdmin && <WsiUploader />}
          <span className="slides-page__spacer" />
          <div className="segmented" role="group" aria-label="Widok">
            {(
              [
                ['tiles', 'Kafelki'],
                ['table', 'Tabela'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`segmented__option${view === value ? ' segmented__option--active' : ''}`}
                aria-pressed={view === value}
                onClick={() => changeView(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {/* One order for both views: the table's headers set it too. */}
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
          <label className="slides-page__search">
            <input
              type="search"
              placeholder="Szukaj nazwy"
              aria-label="Szukaj slajdu"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </header>
        {/* A failed background refresh keeps the last list on screen; only a failed first load replaces it. */}
        {error && data && (
          <p className="slides-page__stale" role="status">
            Nie udało się odświeżyć listy - pokazano ostatni stan. Ponowna próba za chwilę.
          </p>
        )}
        <div className="slides-page__scroll">
          {isPending ? (
            <Spinner label="Wczytywanie slajdów…" />
          ) : !data ? (
            <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać listy slajdów.')} />
          ) : slides.length === 0 ? (
            <div className="slides-page__empty">
              <span>
                {data.length === 0
                  ? isAdmin
                    ? 'Brak slajdów. Prześlij pliki przyciskiem powyżej albo upuść je na tę stronę.'
                    : 'Brak slajdów.'
                  : 'Żaden slajd nie pasuje do wyszukiwania.'}
              </span>
            </div>
          ) : (
            view === 'tiles' ? (
              <SlideGrid slides={slides} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
            ) : (
              <SlideTable
                slides={slides}
                sort={sort}
                onSortChange={setSort}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
              />
            )
          )}
          {isAdmin && (
            <div className="slides-page__uploads">
              <InterruptedUploads />
              {uploads.length > 0 && <UploadQueueList />}
            </div>
          )}
        </div>
      </section>
      <aside className="side-pane" aria-label="Podgląd slajdu">
        {selected ? (
          <SlidePreview key={selected.id} slide={selected} />
        ) : (
          <p className="slides-page__preview-empty">Wybierz slajd z listy.</p>
        )}
      </aside>
      {isDragging && (
        <div className="slides-page__drop" aria-hidden="true">
          <p>
            <strong>Upuść pliki, aby przesłać slajdy</strong>
            <span>Formaty wieloplikowe jako archiwum .zip</span>
          </p>
        </div>
      )}
    </div>
  );
}
