import { useRef, useState, type DragEvent } from 'react';
import Button from '../../../components/ui/Button';
import { formatBytes } from '../../../utils/format';
import { useMultipartUpload } from '../hooks/useMultipartUpload';
import { ACCEPTED_SLIDE_EXTENSIONS, MRXS_ZIP_HINT } from '../slideFileRules';
import './WsiUploader.css';

export default function WsiUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, progress, message, upload, reset } = useMultipartUpload();
  const isUploading = status === 'uploading';

  const selectFile = (selected: File | null) => {
    setFile(selected);
    reset();
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
        </p>
        <p className="wsi-uploader__hint">
          Obsługiwane formaty: SVS, TIFF, NDPI, SCN, BIF, SVSLIDE oraz obrazy JPG/PNG/BMP. {MRXS_ZIP_HINT}
        </p>
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
    </div>
  );
}
