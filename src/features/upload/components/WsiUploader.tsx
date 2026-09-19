import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { useUpload } from '../../../context/UploadProvider';
import StorageFilePicker from '../../storage/components/StorageFilePicker';
import { useSlide } from '../../slides/hooks/useSlide';
import { slideQueryKeys } from '../../../services/slidesApi';
import { importFromStorage } from '../../../services/uploadApi';
import type { StorageObject } from '../../../types/storage';
import { getErrorMessage } from '../../../utils/errors';
import { formatBytes } from '../../../utils/format';
import { ACCEPTED_UPLOAD_EXTENSIONS } from '../slideFileRules';
import SlideFormatGuide from './SlideFormatGuide';
import './WsiUploader.css';

export default function WsiUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { status, progress, message, slideId, file, selectFile, upload, cancel } = useUpload();
  const isUploading = status === 'uploading';
  // "Wgraj" must stay disabled through server-side ingestion too, not just the browser upload -
  // clicking it while "completed" would kick off a second upload of the same file mid-ingest.
  const isBusy = isUploading || status === 'completed';

  // The upload itself finishes at "completed", but ingestion keeps running server-side; watch the
  // created slide so this panel doesn't keep saying "processing" forever once it's actually done.
  const ingestedSlide = useSlide(slideId ?? '', { enabled: status === 'completed' && slideId !== null });
  useEffect(() => {
    if (status !== 'completed' || !ingestedSlide.data) return;
    // Ready or failed - either way ingestion is done and the slide card below shows the outcome.
    if (ingestedSlide.data.status === 'ready' || ingestedSlide.data.status === 'failed') {
      selectFile(null);
    }
  }, [status, ingestedSlide.data, selectFile]);

  const selectFromStorage = async (object: StorageObject) => {
    setIsPickerOpen(false);
    setIsImporting(true);
    setImportError(null);
    try {
      await importFromStorage(object.key);
      void queryClient.invalidateQueries({ queryKey: slideQueryKeys.all });
    } catch (error) {
      setImportError(getErrorMessage(error, 'Nie udało się zaimportować pliku z magazynu.'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) selectFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <div
      className={`wsi-uploader${isDragging ? ' wsi-uploader--dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="wsi-uploader__pick">
        <p className="wsi-uploader__prompt">
          Przeciągnij plik lub
          <Button disabled={isUploading} onClick={() => inputRef.current?.click()}>
            Wybierz plik
          </Button>
          lub
          <Button disabled={isImporting} onClick={() => setIsPickerOpen(true)}>
            {isImporting ? 'Importowanie…' : 'Wybierz z magazynu'}
          </Button>
        </p>
        <p className="wsi-uploader__hint">
          Pojedynczy plik lub archiwum .zip dla formatów wieloplikowych – szczegóły poniżej.
        </p>
        {importError && <ErrorMessage message={importError} onDismiss={() => setImportError(null)} />}
      </div>

      {file && (
        <>
          <div className={`wsi-uploader__file wsi-uploader__file--${status}`}>
            <div className="wsi-uploader__file-row">
              <span className="wsi-uploader__name" title={file.name}>
                {file.name}
              </span>
              <span className="mono-data">
                {formatBytes(file.size)}
                {isUploading && ` · ${progress}%`}
              </span>
            </div>
            {(isUploading || status === 'completed') && (
              <progress className="wsi-uploader__progress" value={progress} max={100} aria-label="Postęp przesyłania" />
            )}
            {message && <p className="wsi-uploader__message">{message}</p>}
          </div>
          <div className="wsi-uploader__file-actions">
            <Button variant="primary" onClick={() => void upload(file)} disabled={isBusy}>
              {isUploading ? 'Wgrywanie…' : status === 'completed' ? 'Przetwarzanie…' : 'Wgraj'}
            </Button>
            {isUploading && <Button onClick={() => void cancel()}>Anuluj</Button>}
          </div>
        </>
      )}

      <SlideFormatGuide />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_UPLOAD_EXTENSIONS.join(',')}
        hidden
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <Modal title="Wybierz plik z magazynu" open={isPickerOpen} onClose={() => setIsPickerOpen(false)}>
        <StorageFilePicker onSelect={(object) => void selectFromStorage(object)} />
      </Modal>
    </div>
  );
}
