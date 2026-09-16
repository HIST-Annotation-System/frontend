import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUpload } from '../../context/UploadProvider';
import { formatBytes } from '../../utils/format';
import Button from '../ui/Button';
import './UploadStatusBar.css';

/** Floating upload progress, visible from any page so leaving the library panel doesn't hide it.
 *
 * The library page (`/`) already shows the same progress inline in `WsiUploader`, so this stays
 * hidden there to avoid showing the same upload twice.
 */
export default function UploadStatusBar() {
  const { pathname } = useLocation();
  const { status, progress, file, cancel } = useUpload();

  if (status !== 'uploading' || !file || pathname === '/') return null;

  return (
    <div className="upload-status-bar" role="status">
      <div className="upload-status-bar__info">
        <span className="upload-status-bar__name" title={file.name}>
          {file.name}
        </span>
        <span className="mono-data">
          {formatBytes(file.size)} · {progress}%
        </span>
        <Button
          variant="ghost"
          icon={<X size={14} />}
          title="Anuluj przesyłanie"
          aria-label="Anuluj przesyłanie"
          onClick={() => void cancel()}
        />
      </div>
      <progress className="upload-status-bar__progress" value={progress} max={100} aria-label="Postęp przesyłania" />
    </div>
  );
}
