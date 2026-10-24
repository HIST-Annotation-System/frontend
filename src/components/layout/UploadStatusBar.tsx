
import { useLocation } from 'react-router-dom';
import { useUpload } from '../../context/UploadProvider';
import { formatRemainingTime, formatTransferRate } from '../../utils/format';
import { progressPercent } from '../../features/upload/utils/uploadProgress';
import { summarizeQueue } from '../../features/upload/utils/uploadQueue';
import './UploadStatusBar.css';

const VIEWER_ROUTE = /^\/(slides|hotspots)\/[^/]+/;

/** Upload progress, visible from any page so leaving the library panel doesn't hide it.
 *
 * The library page (`/`) already shows the whole queue below the slides, so this stays
 * hidden there to avoid showing the same uploads twice. Viewer screens get a small pill instead of
 * the full-width bar, so the image keeps its height.
 */
export default function UploadStatusBar() {
  const { pathname } = useLocation();
  const { items, cancel } = useUpload();
  const { active, queuedCount } = summarizeQueue(items);

  if (!active || pathname === '/') return null;

  const finalizing = active.status === 'finalizing';
  const percent = progressPercent(active);
  const speed = [
    active.bytesPerSecond !== null ? formatTransferRate(active.bytesPerSecond) : null,
    active.etaSeconds !== null ? `~${formatRemainingTime(active.etaSeconds)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (VIEWER_ROUTE.test(pathname)) {
    return (
      <div className="upload-pill" role="status" title={`Wgrywanie w tle: ${active.file.name}`}>
        <span className="upload-pill__track">
          <span className="upload-pill__fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="upload-pill__percent">{finalizing ? '…' : `${percent}%`}</span>
        {queuedCount > 0 && <span className="upload-pill__queue">+{queuedCount}</span>}
      </div>
    );
  }

  return (
    <div className="upload-status-bar" role="status">
      <span className="upload-status-bar__title">{finalizing ? 'Finalizowanie…' : 'Wgrywanie'}</span>
      <span className="upload-status-bar__name" title={active.file.name}>
        {active.file.name}
      </span>
      <div
        className={`upload-status-bar__track${finalizing ? ' upload-status-bar__track--indeterminate' : ''}`}
        role="progressbar"
        aria-label="Postęp wgrywania"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="upload-status-bar__fill" style={{ width: finalizing ? undefined : `${percent}%` }} />
      </div>
      <span className="upload-status-bar__percent">{percent}%</span>
      <span className="upload-status-bar__speed">{speed}</span>
      {queuedCount > 0 && <span className="upload-status-bar__queue">+{queuedCount} w kolejce</span>}
      <button type="button" className="upload-status-bar__cancel" onClick={() => void cancel(active.id)}>
        Anuluj wgrywanie
      </button>
    </div>
  );
}
