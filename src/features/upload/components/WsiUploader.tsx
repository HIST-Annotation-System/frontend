import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type DragEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import StorageFilePicker from '../../storage/components/StorageFilePicker';
import { slideQueryKeys } from '../../../services/slidesApi';
import { importFromStorage } from '../../../services/uploadApi';
import type { StorageObject } from '../../../types/storage';
import { getErrorMessage } from '../../../utils/errors';
import { formatBytes } from '../../../utils/format';
import { useMultipartUpload } from '../hooks/useMultipartUpload';
import { ACCEPTED_SLIDE_EXTENSIONS, MRXS_ZIP_HINT } from '../slideFileRules';
import './WsiUploader.css';

export default function WsiUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { status, progress, message, upload, reset } = useMultipartUpload();
  const isUploading = status === 'uploading';

  const selectFile = (selected: File | null) => {
    setFile(selected);
    reset();
  };

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
          Obsługiwane formaty: SVS, TIFF, NDPI, SCN, BIF, SVSLIDE oraz obrazy JPG/PNG/BMP. {MRXS_ZIP_HINT}
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
          <Button variant="primary" onClick={() => void upload(file)} disabled={isUploading}>
            {isUploading ? 'Wgrywanie…' : 'Wgraj'}
          </Button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <Modal title="Wybierz plik z magazynu" open={isPickerOpen} onClose={() => setIsPickerOpen(false)}>
        <StorageFilePicker onSelect={(object) => void selectFromStorage(object)} />
      </Modal>
    </div>
  );
}
