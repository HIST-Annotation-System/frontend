import { Check, ImageOff, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { getThumbnailUrl } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import { getErrorMessage } from '../../../utils/errors';
import { formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useSlideMutations } from '../hooks/useSlideMutations';
import SlideStatusBadge from './SlideStatusBadge';

interface SlideCardProps {
  slide: Slide;
}

export default function SlideCard({ slide }: SlideCardProps) {
  const magnification = getNativeMagnification(slide);
  const { renameSlide, isRenaming, deleteSlide, isDeleting, cancelUpload, isCancelling } = useSlideMutations();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(slide.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUploading = slide.status === 'uploading';

  const startEditing = () => {
    setNameDraft(slide.name);
    setIsEditingName(true);
    setError(null);
  };

  const cancelEditing = () => {
    setNameDraft(slide.name);
    setIsEditingName(false);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || name === slide.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await renameSlide({ slideId: slide.id, name });
      setIsEditingName(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się zmienić nazwy slajdu.'));
    }
  };

  const confirmDelete = async () => {
    try {
      if (isUploading) {
        await cancelUpload(slide.id);
      } else {
        await deleteSlide(slide.id);
      }
    } catch (requestError) {
      setIsConfirmingDelete(false);
      setError(getErrorMessage(requestError, isUploading ? 'Nie udało się anulować przesyłania.' : 'Nie udało się usunąć slajdu.'));
    }
  };

  const isProcessing = slide.status === 'processing';

  return (
    <div className="slide-card">
      {slide.status === 'ready' ? (
        <Link to={`/slides/${slide.id}`} className="slide-card__thumbnail" aria-label={`Otwórz slajd ${slide.name}`}>
          <img src={getThumbnailUrl(slide.id)} alt="" loading="lazy" />
        </Link>
      ) : (
        <div className="slide-card__thumbnail">
          <ImageOff size={28} aria-hidden="true" />
        </div>
      )}
      <div className="slide-card__body">
        <div className="slide-card__title-row">
          {isEditingName ? (
            <input
              className="slide-card__name-input"
              value={nameDraft}
              autoFocus
              disabled={isRenaming}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveName();
                if (event.key === 'Escape') cancelEditing();
              }}
              onBlur={() => void saveName()}
            />
          ) : (
            <span className="slide-card__name" title={slide.original_filename}>
              {slide.name}
            </span>
          )}
          <div className="slide-card__actions">
            {isEditingName ? (
              <>
                <Button
                  variant="ghost"
                  icon={<Check size={14} />}
                  title="Zapisz"
                  aria-label="Zapisz nazwę"
                  disabled={isRenaming}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void saveName()}
                />
                <Button
                  variant="ghost"
                  icon={<X size={14} />}
                  title="Anuluj"
                  aria-label="Anuluj zmianę nazwy"
                  disabled={isRenaming}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={cancelEditing}
                />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  icon={<Pencil size={14} />}
                  title="Zmień nazwę"
                  aria-label={`Zmień nazwę slajdu ${slide.name}`}
                  onClick={startEditing}
                />
                <Button
                  variant="ghost"
                  icon={isUploading ? <X size={14} /> : <Trash2 size={14} />}
                  title={isUploading ? 'Anuluj przesyłanie' : 'Usuń slajd'}
                  aria-label={isUploading ? `Anuluj przesyłanie slajdu ${slide.name}` : `Usuń slajd ${slide.name}`}
                  onClick={() => setIsConfirmingDelete(true)}
                />
              </>
            )}
          </div>
        </div>
        <div className="slide-card__meta-row">
          <span className="slide-card__meta">
            {formatDimensions(slide.width, slide.height)}
            {magnification ? ` · ${magnification}×` : ''}
            {slide.vendor ? ` · ${slide.vendor}` : ''}
          </span>
          {slide.status !== 'ready' && <SlideStatusBadge status={slide.status} />}
        </div>
        {isProcessing && (
          <div className="slide-card__progress-row">
            <div
              className="slide-card__progress"
              role="progressbar"
              aria-label="Postęp przetwarzania"
              aria-valuenow={slide.ingest_progress ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`slide-card__progress-bar${slide.ingest_progress === null ? ' slide-card__progress-bar--indeterminate' : ''}`}
                style={slide.ingest_progress !== null ? { width: `${slide.ingest_progress}%` } : undefined}
              />
            </div>
            {slide.ingest_progress !== null && (
              <span className="slide-card__progress-label mono-data">{slide.ingest_progress}%</span>
            )}
          </div>
        )}
        {slide.status === 'failed' && slide.error_message && (
          <span className="slide-card__error">{slide.error_message}</span>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      </div>

      <Modal
        title={isUploading ? 'Anuluj przesyłanie' : 'Usuń slajd'}
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
      >
        <p>
          {isUploading ? (
            <>Czy na pewno chcesz anulować przesyłanie pliku „{slide.name}”? Przesłane dotąd dane zostaną odrzucone.</>
          ) : (
            <>
              Czy na pewno chcesz usunąć slajd „{slide.name}”? Plik oraz wszystkie jego anotacje zostaną trwale usunięte.
              Tej operacji nie można cofnąć.
            </>
          )}
        </p>
        <div className="slide-card__confirm-actions">
          <Button onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting || isCancelling}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeleting || isCancelling}>
            {isUploading ? (isCancelling ? 'Anulowanie…' : 'Anuluj przesyłanie') : isDeleting ? 'Usuwanie…' : 'Usuń'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
