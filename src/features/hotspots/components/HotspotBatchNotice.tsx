import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { useHotspotBatch } from '../hooks/useHotspots';
import './Hotspots.css';

interface HotspotBatchNoticeProps {
  batchId: string;
  onDismiss: () => void;
}

/** Progress of the hotspots being cut out of the slide, in the viewer's inspector (it may be dismissed at any time). */
export default function HotspotBatchNotice({ batchId, onDismiss }: HotspotBatchNoticeProps) {
  const { data: batch } = useHotspotBatch(batchId);
  if (!batch) return null;

  return (
    <div className="hotspot-saved" role="status">
      {batch.status === 'running' && (
        <span>
          Tworzenie hotspotów{' '}
          <span className="mono-data">
            {batch.done} / {batch.total}
          </span>
          …
        </span>
      )}
      {batch.status === 'done' && (
        <span>
          Utworzono hotspoty: <span className="mono-data">{batch.total}</span>
        </span>
      )}
      {batch.status === 'failed' && (
        <span className="text-error">
          Przerwano po {batch.done} z {batch.total}: {batch.error_message}
        </span>
      )}
      <span className="hotspot-saved__actions">
        <Link to={`/hotspots?folder=${batch.folder_id}`}>Pokaż folder</Link>
        <Button small onClick={onDismiss}>
          Ukryj
        </Button>
      </span>
    </div>
  );
}
