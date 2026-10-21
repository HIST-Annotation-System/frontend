import Button from '../../../components/ui/Button';
import { useUpload } from '../../../context/UploadProvider';
import { formatBytes } from '../../../utils/format';
import { describeTransfer, progressPercent } from '../utils/uploadProgress';
import { isActive, type UploadItem } from '../utils/uploadQueue';
import './UploadQueueList.css';

function UploadQueueRow({ item }: { item: UploadItem }) {
  const { cancel, retry, remove, uploadAnyway } = useUpload();
  const active = isActive(item);
  const canResume = item.status === 'error' && item.resume !== null;

  return (
    <li className={`upload-queue__item upload-queue__item--${item.status}`}>
      <span className="upload-queue__name" title={item.file.name}>
        {item.file.name}
      </span>
      <span className="mono-data upload-queue__size">
        {formatBytes(item.file.size)}
        {item.status === 'uploading' && ` · ${describeTransfer(item)}`}
        {item.status === 'queued' && ' · w kolejce'}
        {item.status === 'completed' && ' · gotowe'}
      </span>
      {active || item.status === 'completed' || canResume ? (
        <progress
          className="upload-queue__progress"
          value={item.status === 'completed' ? 100 : progressPercent(item)}
          max={100}
          aria-label={`Postęp przesyłania pliku ${item.file.name}`}
        />
      ) : (
        <span />
      )}
      <span className="upload-queue__actions">
        {item.status === 'error' && item.duplicate && (
          <Button small onClick={() => uploadAnyway(item.id)}>
            Wgraj mimo to
          </Button>
        )}
        {canResume && (
          <Button small onClick={() => retry(item.id)}>
            Wznów
          </Button>
        )}
        {active || item.status === 'queued' || canResume ? (
          <Button small aria-label={`Anuluj przesyłanie pliku ${item.file.name}`} onClick={() => void cancel(item.id)}>
            Anuluj
          </Button>
        ) : (
          <Button small aria-label={`Usuń ${item.file.name} z listy`} onClick={() => remove(item.id)}>
            Usuń
          </Button>
        )}
      </span>
      {item.message && <p className="upload-queue__message">{item.message}</p>}
    </li>
  );
}

/** The upload queue, docked under the slide table while it has items. */
export default function UploadQueueList() {
  const { items, clearFinished } = useUpload();
  if (items.length === 0) return null;
  const hasFinished = items.some((item) => item.status === 'completed' || item.status === 'error');
  const done = items.filter((item) => item.status === 'completed').length;

  return (
    <section className="upload-queue" aria-label="Kolejka przesyłania">
      <header className="upload-queue__header">
        <span>
          Przesyłanie · <span className="mono-data">{done}</span> z <span className="mono-data">{items.length}</span>
        </span>
        {hasFinished && (
          <Button small onClick={clearFinished}>
            Wyczyść zakończone
          </Button>
        )}
      </header>
      <ul className="upload-queue__list">
        {items.map((item) => (
          <UploadQueueRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
