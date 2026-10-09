import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUpload } from '../../context/UploadProvider';
import { describeTransfer, progressPercent } from '../../features/upload/utils/uploadProgress';
import { summarizeQueue } from '../../features/upload/utils/uploadQueue';
import Button from '../ui/Button';
import './UploadStatusBar.css';

/** Floating upload progress, visible from any page so leaving the library panel doesn't hide it.
 *
 * The library page (`/`) already shows the whole queue inline in `WsiUploader`, so this stays
 * hidden there to avoid showing the same uploads twice.
 */
export default function UploadStatusBar() {
  const { pathname } = useLocation();
  const { items, cancel } = useUpload();
  const { active, queuedCount } = summarizeQueue(items);

  if (!active || pathname === '/') return null;

  return (
    <div className="upload-status-bar" role="status">
      <div className="upload-status-bar__info">
        <span className="upload-status-bar__name" title={active.file.name}>
          {active.file.name}
        </span>
        <Button
          variant="ghost"
          icon={<X size={14} />}
          title="Anuluj przesyłanie"
          aria-label="Anuluj przesyłanie"
          onClick={() => void cancel(active.id)}
        />
      </div>
      <span className="mono-data upload-status-bar__details">
        {active.status === 'finalizing' ? 'Finalizowanie…' : describeTransfer(active)}
        {queuedCount > 0 && ` · +${queuedCount} w kolejce`}
      </span>
      <progress
        className="upload-status-bar__progress"
        value={progressPercent(active)}
        max={100}
        aria-label="Postęp przesyłania"
      />
    </div>
  );
}
