import { useState, type DragEvent } from 'react';
import ErrorMessage from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadProvider';
import SlidePreview from '../features/slides/components/SlidePreview';
import SlideTable from '../features/slides/components/SlideTable';
import { useSlides } from '../features/slides/hooks/useSlides';
import InterruptedUploads from '../features/upload/components/InterruptedUploads';
import UploadQueueList from '../features/upload/components/UploadQueueList';
import WsiUploader from '../features/upload/components/WsiUploader';
import { getErrorMessage } from '../utils/errors';
import './SlidesPage.css';

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

/** The slide library: a table of slides with the selected one in a preview pane; admins add slides here. */
export default function SlidesPage() {
  const { user } = useAuth();
  // Adding slides is an administrator task (the upload API enforces it too).
  const isAdmin = user?.role === 'ADMIN';
  const { enqueue } = useUpload();
  const { data, isPending, error } = useSlides();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const needle = query.trim().toLowerCase();
  const slides = (data ?? []).filter(
    (slide) => !needle || slide.name.toLowerCase().includes(needle) || slide.original_filename.toLowerCase().includes(needle),
  );
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
    <div className="slides-page" {...dropHandlers}>
      <section className="slides-page__main" aria-label="Slajdy">
        <div className="page-strip">
          <h1 className="page-strip__title">
            Slajdy
            {data && <span className="page-strip__count">{data.length}</span>}
          </h1>
          {isAdmin && <WsiUploader />}
          <span className="page-strip__spacer" />
          <input
            className="field slides-page__search"
            type="search"
            placeholder="Szukaj nazwy"
            aria-label="Szukaj slajdu"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
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
            <p className="slides-page__empty">
              {data.length === 0
                ? isAdmin
                  ? 'Brak slajdów. Prześlij pliki przyciskiem powyżej albo upuść je na tę stronę.'
                  : 'Brak slajdów.'
                : 'Żaden slajd nie pasuje do wyszukiwania.'}
            </p>
          ) : (
            <SlideTable slides={slides} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          )}
        </div>
        {isAdmin && (
          <>
            <InterruptedUploads />
            <UploadQueueList />
          </>
        )}
      </section>
      <aside className="slides-page__preview" aria-label="Podgląd slajdu">
        {selected ? (
          <SlidePreview key={selected.id} slide={selected} />
        ) : (
          <p className="slides-page__empty">Wybierz slajd z listy.</p>
        )}
      </aside>
      {isDragging && (
        <div className="wsi-drop">
          <p>
            <strong>Upuść pliki, aby przesłać slajdy</strong>
            <span className="text-muted">Formaty wieloplikowe jako archiwum .zip</span>
          </p>
        </div>
      )}
    </div>
  );
}
