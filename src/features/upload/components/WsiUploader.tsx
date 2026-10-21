import { useQueryClient } from '@tanstack/react-query';
import { Cloud, FolderOpen, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
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
import InterruptedUploads from './InterruptedUploads';
import SlideFormatGuide from './SlideFormatGuide';
import UploadQueueList from './UploadQueueList';
import './WsiUploader.css';

const ALREADY_IMPORTED = 'Ten plik był już zaimportowany - w bibliotece jest istniejący slajd.';

export default function WsiUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    enqueue(event.dataTransfer.files);
  };

  return (
    <div
      className={`wsi-uploader${isDragging ? ' wsi-uploader--dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="wsi-uploader__dropzone">
        <span className="wsi-uploader__icon" aria-hidden="true">
          <Upload size={20} />
        </span>
        <p className="wsi-uploader__prompt">Przeciągnij pliki tutaj</p>
        <p className="wsi-uploader__extensions">{ACCEPTED_UPLOAD_EXTENSIONS.join(' ')}</p>
        <p className="wsi-uploader__hint">
          Można wybrać kilka plików naraz - trafią do kolejki. Formaty wieloplikowe jako archiwum .zip, szczegóły
          poniżej.
        </p>
        <div className="wsi-uploader__buttons">
          <Button variant="primary" icon={<FolderOpen size={16} />} onClick={() => inputRef.current?.click()}>
            Wybierz pliki
          </Button>
          <Button icon={<Cloud size={16} />} disabled={isImporting} onClick={() => setIsPickerOpen(true)}>
            {isImporting ? 'Importowanie…' : 'Wybierz z magazynu'}
          </Button>
        </div>
      </div>
      {importError && <ErrorMessage message={importError} onDismiss={() => setImportError(null)} />}
      {importNotice && <p className="wsi-uploader__message">{importNotice}</p>}
      {queueNotice && <p className="wsi-uploader__message">{queueNotice}</p>}

      <UploadQueueList />
      <InterruptedUploads />

      <SlideFormatGuide />

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
    </div>
  );
}
