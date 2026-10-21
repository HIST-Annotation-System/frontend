import { CircleAlert, CircleX, CloudUpload, FileX, LoaderCircle, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useUpload } from '../../../context/UploadProvider';
import { getThumbnailUrl } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import { formatBytes, formatDateTime, formatDimensions } from '../../../utils/format';
import { getNativeMagnification } from '../../../utils/magnification';
import { useSlideMutations } from '../hooks/useSlideMutations';
import { describeSlideMutationError, isSlideGone, isSlideModified } from '../utils/slideConflicts';
import { describeUploader } from '../utils/slideUploader';
import { progressPercent } from '../../upload/utils/uploadProgress';
import SlideStatusBadge from './SlideStatusBadge';

/** Placeholder shown in the thumbnail area until the slide is ready. */
const THUMBNAIL_PLACEHOLDERS: Record<Exclude<Slide['status'], 'ready'>, { icon: LucideIcon; label: string }> = {
  uploading: { icon: CloudUpload, label: 'oczekiwanie na plik' },
  processing: { icon: LoaderCircle, label: 'generowanie miniatury' },
  failed: { icon: FileX, label: 'brak podglądu' },
};

const fileExtension = (filename: string): string | null => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot).toLowerCase() : null;
};

interface SlideCardProps {
  slide: Slide;
}

export default function SlideCard({ slide }: SlideCardProps) {
  const magnification = getNativeMagnification(slide);
  const { renameSlide, isRenaming, deleteSlide, isDeleting, cancelUpload, isCancelling } = useSlideMutations();
  const { user } = useAuth();
  const upload = useUpload();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(slide.name);
  // The version the user saw when they started editing/deleting: the list keeps refreshing underneath,
  // and sending the refreshed version would silently overwrite someone else's change.
  const [seenVersion, setSeenVersion] = useState(slide.version);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Enter and the blur that follows both save: the second one must not resend with the old version.
  const isSavingName = useRef(false);
  const isUploading = slide.status === 'uploading';
  const canManage = user?.role === 'ADMIN';
  const uploader = describeUploader(slide, user?.username);
  // An upload running in this browser is cancelled through its queue (which also stops the transfer).
  const ownUpload = upload.items.find((item) => item.slideId === slide.id && item.status !== 'completed');

  const startEditing = () => {
    setNameDraft(slide.name);
    setSeenVersion(slide.version);
    setIsEditingName(true);
    setError(null);
  };

  const startDeleting = () => {
    setSeenVersion(slide.version);
    setError(null);
    setIsConfirmingDelete(true);
  };

  const cancelEditing = () => {
    setNameDraft(slide.name);
    setIsEditingName(false);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (isSavingName.current) return;
    if (!name || name === slide.name) {
      setIsEditingName(false);
      return;
    }
    isSavingName.current = true;
    try {
      await renameSlide({ slideId: slide.id, name, version: seenVersion });
      setIsEditingName(false);
    } catch (requestError) {
      // After a conflict the refreshed name is what the user needs to see; otherwise keep their draft.
      if (isSlideModified(requestError) || isSlideGone(requestError)) setIsEditingName(false);
      setError(describeSlideMutationError(requestError, 'Nie udało się zmienić nazwy slajdu.'));
    } finally {
      isSavingName.current = false;
    }
  };

  const confirmDelete = async () => {
    try {
      if (ownUpload) {
        await upload.cancel(ownUpload.id);
      } else if (isUploading) {
        await cancelUpload(slide.id);
      } else {
        await deleteSlide({ slideId: slide.id, version: seenVersion });
      }
    } catch (requestError) {
      setIsConfirmingDelete(false);
      setError(
        describeSlideMutationError(
          requestError,
          isUploading ? 'Nie udało się anulować przesyłania.' : 'Nie udało się usunąć slajdu.',
        ),
      );
    }
  };

  const isProcessing = slide.status === 'processing';
  // Upload progress: live from this tab's own queue, otherwise as last reported by the uploading browser.
  const uploadPercent = ownUpload && ownUpload.status !== 'queued' ? progressPercent(ownUpload) : slide.ingest_progress;
  const progress = isUploading ? uploadPercent : slide.ingest_progress;

  const extension = fileExtension(slide.original_filename);
  const placeholder = slide.status === 'ready' ? null : THUMBNAIL_PLACEHOLDERS[slide.status];
  const PlaceholderIcon = placeholder?.icon;
  const dimensions =
    slide.width && slide.height
      ? `${formatDimensions(slide.width, slide.height)}${magnification ? ` · ${magnification}×` : ''}`
      : isUploading || isProcessing
        ? 'rozdzielczość po przetworzeniu'
        : formatDimensions(slide.width, slide.height);
  const metaParts = [
    slide.file_size_bytes !== null ? formatBytes(slide.file_size_bytes) : null,
    dimensions,
    slide.vendor,
  ].filter(Boolean);

  return (
    <div className="slide-card">
      <div className="slide-card__media">
        {slide.status === 'ready' ? (
          <Link to={`/slides/${slide.id}`} className="slide-card__thumbnail" aria-label={`Otwórz slajd ${slide.name}`}>
            <img src={getThumbnailUrl(slide.id)} alt="" loading="lazy" />
          </Link>
        ) : (
          <div className={`slide-card__thumbnail slide-card__thumbnail--${slide.status}`}>
            {PlaceholderIcon && <PlaceholderIcon size={22} aria-hidden="true" />}
            {placeholder && <span className="slide-card__thumbnail-label">{placeholder.label}</span>}
          </div>
        )}
        {extension && <span className="slide-card__format">{extension}</span>}
        {canManage && !isUploading && (
          <button
            type="button"
            className="slide-card__delete"
            title="Usuń slajd"
            aria-label={`Usuń slajd ${slide.name}`}
            onClick={startDeleting}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="slide-card__body">
        {isEditingName ? (
          <div className="slide-card__edit">
            <input
              className="slide-card__name-input"
              value={nameDraft}
              autoFocus
              aria-label="Nazwa slajdu"
              disabled={isRenaming}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveName();
                if (event.key === 'Escape') cancelEditing();
              }}
              onBlur={() => void saveName()}
            />
            <div className="slide-card__edit-actions">
              <Button
                className="btn-sm"
                aria-label="Anuluj zmianę nazwy"
                disabled={isRenaming}
                onMouseDown={(event) => event.preventDefault()}
                onClick={cancelEditing}
              >
                Anuluj
              </Button>
              <Button
                variant="primary"
                className="btn-sm"
                aria-label="Zapisz nazwę"
                disabled={isRenaming}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void saveName()}
              >
                Zapisz
              </Button>
            </div>
          </div>
        ) : (
          <div className="slide-card__title-row">
            <span className="slide-card__name" title={slide.original_filename}>
              {slide.name}
            </span>
            {canManage && (
              <div className="slide-card__actions">
                <Button
                  variant="ghost"
                  icon={<Pencil size={14} />}
                  title="Zmień nazwę"
                  aria-label={`Zmień nazwę slajdu ${slide.name}`}
                  onClick={startEditing}
                />
              </div>
            )}
          </div>
        )}
        <div className="slide-card__status-row">
          <SlideStatusBadge status={slide.status} />
        </div>
        <div className="slide-card__meta-row">
          <span className="slide-card__meta">{metaParts.join(' · ')}</span>
          <span className="slide-card__uploader">
            <span className="slide-card__date">{formatDateTime(slide.created_at)}</span>
            {uploader && <> · {uploader}</>}
          </span>
        </div>
        {(isProcessing || isUploading) && (
          <div className="slide-card__progress-block">
            <div className="slide-card__progress-head">
              <span>{isUploading ? 'Postęp wgrywania' : 'Postęp przetwarzania'}</span>
              {progress !== null && <span className="slide-card__progress-label">{progress}%</span>}
            </div>
            <div
              className="slide-card__progress"
              role="progressbar"
              aria-label={isUploading ? 'Postęp wgrywania' : 'Postęp przetwarzania'}
              aria-valuenow={progress ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`slide-card__progress-bar${isProcessing ? ' slide-card__progress-bar--accent' : ''}${progress === null ? ' slide-card__progress-bar--indeterminate' : ''}`}
                style={progress !== null ? { width: `${progress}%` } : undefined}
              />
            </div>
          </div>
        )}
        {slide.status === 'failed' && slide.error_message && (
          <span className="slide-card__error">
            <CircleAlert size={14} aria-hidden="true" />
            <span>{slide.error_message}</span>
          </span>
        )}
        {canManage && isUploading && (
          <Button
            variant="ghost"
            className="btn-sm slide-card__cancel"
            icon={<CircleX size={14} />}
            aria-label={`Anuluj przesyłanie slajdu ${slide.name}`}
            onClick={startDeleting}
          >
            Anuluj przesyłanie
          </Button>
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
            <>
              Czy na pewno chcesz anulować przesyłanie pliku „{slide.name}”? Przesłane dotąd dane zostaną odrzucone.
              {!ownUpload && (
                <> Ten plik może właśnie wgrywać inny administrator - anulowanie przerwie jego przesyłanie.</>
              )}
            </>
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
