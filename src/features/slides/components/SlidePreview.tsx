import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useUpload } from '../../../context/UploadProvider';
import { getThumbnailUrl } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import SlideInfo from '../../viewer/components/SlideInfo';
import { useSlideMutations } from '../hooks/useSlideMutations';
import { describeSlideMutationError, isSlideGone, isSlideModified } from '../utils/slideConflicts';
import { describeUploader } from '../utils/slideUploader';
import { useSlideProgress } from '../hooks/useSlideProgress';
import { SlideStatus } from './SlideTable';

interface SlidePreviewProps {
  slide: Slide;
}

/** The library's right pane: the selected slide's thumbnail, parameters, and (for admins) rename and delete. */
export default function SlidePreview({ slide }: SlidePreviewProps) {
  const { renameSlide, isRenaming, deleteSlide, isDeleting, cancelUpload, isCancelling } = useSlideMutations();
  const { user } = useAuth();
  const upload = useUpload();
  const progressOf = useSlideProgress();
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

  return (
    <div className="preview-pane">
      {slide.status === 'ready' ? (
        <Link to={`/slides/${slide.id}`} aria-label={`Otwórz slajd ${slide.name}`}>
          <img className="preview-pane__image" src={getThumbnailUrl(slide.id)} alt="" />
        </Link>
      ) : (
        <div className="preview-pane__image" aria-hidden="true" />
      )}
      {isEditingName ? (
        <input
          className="field"
          value={nameDraft}
          autoFocus
          aria-label="Nazwa slajdu (Enter zapisuje, Esc anuluje)"
          disabled={isRenaming}
          onChange={(event) => setNameDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void saveName();
            if (event.key === 'Escape') setIsEditingName(false);
          }}
          onBlur={() => void saveName()}
        />
      ) : (
        <h2 className="preview-pane__title">{slide.name}</h2>
      )}
      <dl className="kv">
        <dt>Stan</dt>
        <dd>
          <SlideStatus slide={slide} progress={progressOf(slide)} />
        </dd>
      </dl>
      {slide.status === 'failed' && slide.error_message && <p className="text-error">{slide.error_message}</p>}
      <SlideInfo slide={slide} />
      {uploader && <p className="text-muted">{uploader}</p>}
      <div className="preview-pane__actions">
        {slide.status === 'ready' ? (
          <Link className="btn btn--primary btn--block" to={`/slides/${slide.id}`}>
            Otwórz
          </Link>
        ) : (
          <Button variant="primary" block disabled>
            Otwórz
          </Button>
        )}
        {canManage && (
          <>
            <Button block disabled={isUploading} onClick={startEditing}>
              Zmień nazwę
            </Button>
            <Button block variant="danger" onClick={startDeleting}>
              {isUploading ? 'Anuluj przesyłanie…' : 'Usuń slajd…'}
            </Button>
          </>
        )}
      </div>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

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
        <div className="modal-actions">
          <Button onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting || isCancelling}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeleting || isCancelling}>
            {isUploading ? (isCancelling ? 'Anulowanie…' : 'Anuluj przesyłanie') : isDeleting ? 'Usuwanie…' : 'Usuń slajd'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
