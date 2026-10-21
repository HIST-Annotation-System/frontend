import { CircleAlert, CircleCheck, Clock, LoaderCircle, RotateCw, X, type LucideIcon } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useUpload } from '../../../context/UploadProvider';
import { formatBytes } from '../../../utils/format';
import { describeTransfer, progressPercent } from '../utils/uploadProgress';
import { isActive, type UploadItem, type UploadItemStatus } from '../utils/uploadQueue';
import './UploadQueueList.css';

const STATUS_ICONS: Record<UploadItemStatus, LucideIcon> = {
  queued: Clock,
  uploading: LoaderCircle,
  finalizing: LoaderCircle,
  completed: CircleCheck,
  error: CircleAlert,
};

function UploadQueueRow({ item }: { item: UploadItem }) {
  const { cancel, retry, remove, uploadAnyway } = useUpload();
  const active = isActive(item);
  const canResume = item.status === 'error' && item.resume !== null;
  const StatusIcon = STATUS_ICONS[item.status];

  return (
    <li className={`upload-queue__item upload-queue__item--${item.status}`}>
      <div className="upload-queue__row">
        <StatusIcon size={16} className="upload-queue__status-icon" aria-hidden="true" />
        <span className="upload-queue__name" title={item.file.name}>
          {item.file.name}
        </span>
        <span className="mono-data upload-queue__size">
          {formatBytes(item.file.size)}
          {item.status === 'uploading' && ` · ${describeTransfer(item)}`}
        </span>
        <span className="upload-queue__actions">
          {item.status === 'error' && item.duplicate && (
            <Button variant="ghost" onClick={() => uploadAnyway(item.id)}>
              Wgraj mimo to
            </Button>
          )}
          {canResume && (
            <Button variant="ghost" icon={<RotateCw size={14} />} onClick={() => retry(item.id)}>
              Wznów
            </Button>
          )}
          {active || item.status === 'queued' || canResume ? (
            <Button
              variant="ghost"
              icon={<X size={14} />}
              title="Anuluj przesyłanie"
              aria-label={`Anuluj przesyłanie pliku ${item.file.name}`}
              onClick={() => void cancel(item.id)}
            />
          ) : (
            <Button
              variant="ghost"
              icon={<X size={14} />}
              title="Usuń z listy"
              aria-label={`Usuń ${item.file.name} z listy`}
              onClick={() => remove(item.id)}
            />
          )}
        </span>
      </div>
      {(active || item.status === 'completed' || canResume) && (
        <progress
          className="upload-queue__progress"
          value={item.status === 'completed' ? 100 : progressPercent(item)}
          max={100}
          aria-label={`Postęp przesyłania pliku ${item.file.name}`}
        />
      )}
      {item.message && <p className="upload-queue__message">{item.message}</p>}
    </li>
  );
}

export default function UploadQueueList() {
  const { items, clearFinished } = useUpload();
  const hasFinished = items.some((item) => item.status === 'completed' || item.status === 'error');
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <section className="upload-queue" aria-label="Kolejka przesyłania">
      <div className="upload-queue__header">
        <h3 className="label-caps">Kolejka</h3>
        {items.length > 0 && (
          <span className="mono-data upload-queue__summary">
            {items.length} · {formatBytes(totalBytes)}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="upload-queue__empty">Nie wybrano jeszcze plików.</p>
      ) : (
        <ul className="upload-queue__list">
          {items.map((item) => (
            <UploadQueueRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {hasFinished && (
        <Button variant="ghost" className="upload-queue__clear" onClick={clearFinished}>
          Wyczyść zakończone
        </Button>
      )}
    </section>
  );
}
