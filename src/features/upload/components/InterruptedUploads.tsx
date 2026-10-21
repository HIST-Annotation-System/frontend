import { CirclePause, X } from 'lucide-react';
import { useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { useUpload } from '../../../context/UploadProvider';
import { formatBytes, formatDateTime } from '../../../utils/format';
import type { ResumableUpload } from '../utils/resumableUploads';

/** Uploads cut off by a reload or a closed tab: continue them by picking the same file again. */
export default function InterruptedUploads() {
  const { interrupted, resumeInterrupted, discardInterrupted } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resuming, setResuming] = useState<ResumableUpload | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (interrupted.length === 0) return null;

  const pickFileFor = (upload: ResumableUpload) => {
    setResuming(upload);
    setError(null);
    inputRef.current?.click();
  };

  const onFilePicked = (file: File | undefined) => {
    if (!resuming || !file) return;
    setError(resumeInterrupted(resuming, file));
    setResuming(null);
  };

  return (
    <section className="upload-queue" aria-label="Przerwane przesyłanie">
      <h3 className="label-caps">Przerwane przesyłania</h3>
      <p className="upload-queue__note">
        Aby dokończyć przesyłanie, wybierz ponownie ten sam plik - przesyłanie zacznie się od miejsca przerwania.
      </p>
      <ul className="upload-queue__cards">
        {interrupted.map((upload) => (
          <li key={upload.slideId} className="upload-queue__item upload-queue__item--interrupted">
            <div className="upload-queue__row">
              <CirclePause size={16} className="upload-queue__status-icon" aria-hidden="true" />
              <span className="upload-queue__name" title={upload.fileName}>
                {upload.fileName}
              </span>
              <span className="mono-data upload-queue__size">{formatBytes(upload.fileSize)}</span>
              <span className="upload-queue__actions">
                <Button className="btn-sm upload-queue__resume" onClick={() => pickFileFor(upload)}>
                  Wznów
                </Button>
                <Button
                  variant="ghost"
                  icon={<X size={14} />}
                  title="Odrzuć"
                  aria-label={`Odrzuć przerwane przesyłanie pliku ${upload.fileName}`}
                  onClick={() => void discardInterrupted(upload)}
                />
              </span>
            </div>
            <p className="upload-queue__message">przerwano · rozpoczęte {formatDateTime(upload.startedAt)}</p>
          </li>
        ))}
      </ul>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(event) => {
          onFilePicked(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </section>
  );
}
