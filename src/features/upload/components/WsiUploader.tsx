import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { useUpload } from '../../../context/UploadProvider';
import StorageFilePicker from '../../storage/components/StorageFilePicker';
import { slideQueryKeys } from '../../../services/slidesApi';
import { importFromStorage } from '../../../services/uploadApi';
import type { StorageObject } from '../../../types/storage';
import { getErrorMessage } from '../../../utils/errors';
import { ACCEPTED_UPLOAD_EXTENSIONS } from '../slideFileRules';
import SlideFormatGuide from './SlideFormatGuide';
import './WsiUploader.css';

const ALREADY_IMPORTED = 'Ten plik był już zaimportowany - w bibliotece jest istniejący slajd.';

/** Header buttons for adding slides; the library page shows the queue and accepts dropped files itself. */
export default function WsiUploader() {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { enqueue: addToQueue } = useUpload();
  const [queueNotice, setQueueNotice] = useState<string | null>(null);

  const enqueue = (files: Iterable<File>) => {
    const skipped = addToQueue(files);
    setQueueNotice(skipped > 0 ? `Pominięto pliki już dodane do kolejki: ${skipped}.` : null);
  };

  const selectFromStorage = async (object: StorageObject) => {
    setIsPickerOpen(false);
    setIsImporting(true);
    setImportError(null);
    setImportNotice(null);
    try {
      const { created } = await importFromStorage(object.key);
      if (!created) setImportNotice(ALREADY_IMPORTED);
      void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
    } catch (error) {
      setImportError(getErrorMessage(error, 'Nie udało się zaimportować pliku z magazynu.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="wsi-uploader">
      <div className="wsi-uploader__buttons">
        <Button variant="primary" onClick={() => inputRef.current?.click()}>
          Prześlij…
        </Button>
        <Button disabled={isImporting} onClick={() => setIsPickerOpen(true)}>
          {isImporting ? 'Importowanie…' : 'Z magazynu…'}
        </Button>
        <button type="button" className="link-button" onClick={() => setIsGuideOpen(true)}>
          Obsługiwane formaty
        </button>
      </div>
      {importError && <ErrorMessage message={importError} onDismiss={() => setImportError(null)} />}
      {importNotice && <p className="wsi-uploader__message">{importNotice}</p>}
      {queueNotice && <p className="wsi-uploader__message">{queueNotice}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_UPLOAD_EXTENSIONS.join(',')}
        hidden
        onChange={(event) => {
          enqueue(event.target.files ?? []);
          // Allows picking the same file again (e.g. after removing it from the queue).
          event.target.value = '';
        }}
      />
      <Modal title="Wybierz plik z magazynu" open={isPickerOpen} onClose={() => setIsPickerOpen(false)}>
        <StorageFilePicker onSelect={(object) => void selectFromStorage(object)} />
      </Modal>
      <Modal title="Obsługiwane formaty i sposób przesyłania" open={isGuideOpen} onClose={() => setIsGuideOpen(false)}>
        <SlideFormatGuide />
      </Modal>
    </div>
  );
}
