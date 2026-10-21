import { useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { useUpload } from '../../../context/UploadProvider';
import { formatBytes, formatDateTime } from '../../../utils/format';
import type { ResumableUpload } from '../utils/resumableUploads';
import './UploadQueueList.css';

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
      <header className="upload-queue__header">
        <span>Przerwane przesyłanie</span>
      </header>
      <ul className="upload-queue__list">
        {interrupted.map((upload) => (
          <li key={upload.slideId} className="upload-queue__item upload-queue__item--error">
            <span className="upload-queue__name" title={upload.fileName}>
              {upload.fileName}
            </span>
            <span className="tabular upload-queue__size">{formatBytes(upload.fileSize)}</span>
            <span />
            <span className="upload-queue__actions">
              <Button small onClick={() => pickFileFor(upload)}>
                Wznów…
              </Button>
              <Button small onClick={() => void discardInterrupted(upload)}>
                Odrzuć
              </Button>
            </span>
            <p className="upload-queue__message">
              Przesyłanie rozpoczęte {formatDateTime(upload.startedAt)} zostało przerwane. Aby je dokończyć, wybierz
              ponownie ten sam plik.
            </p>
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
