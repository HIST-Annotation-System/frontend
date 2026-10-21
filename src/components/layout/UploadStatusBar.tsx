import { useLocation } from 'react-router-dom';
import { useUpload } from '../../context/UploadProvider';
import { describeTransfer, progressPercent } from '../../features/upload/utils/uploadProgress';
import { summarizeQueue } from '../../features/upload/utils/uploadQueue';
import Button from '../ui/Button';
import './UploadStatusBar.css';

/** Upload progress docked under every page, so leaving the library doesn't hide a running upload.
 *
 * The library page (`/`) already shows the whole queue under the slide table, so this stays
 * hidden there to avoid showing the same uploads twice.
 */
export default function UploadStatusBar() {
  const { pathname } = useLocation();
  const { items, cancel } = useUpload();
  const { active, queuedCount } = summarizeQueue(items);

  if (!active || pathname === '/') return null;

  return (
    <div className="upload-status-bar" role="status">
      <span className="upload-status-bar__label">Przesyłanie</span>
      <span className="upload-status-bar__name" title={active.file.name}>
        {active.file.name}
      </span>
      <span className="tabular upload-status-bar__details">
        {active.status === 'finalizing' ? 'finalizowanie…' : describeTransfer(active)}
        {queuedCount > 0 && ` · +${queuedCount} w kolejce`}
      </span>
      <progress
        className="upload-status-bar__progress"
        value={progressPercent(active)}
        max={100}
        aria-label="Postęp przesyłania"
      />
      <Button small onClick={() => void cancel(active.id)}>
        Anuluj
      </Button>
    </div>
  );
}
