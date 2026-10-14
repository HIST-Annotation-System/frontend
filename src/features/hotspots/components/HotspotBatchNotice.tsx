import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { useHotspotBatch } from '../hooks/useHotspots';
import './Hotspots.css';

interface HotspotBatchNoticeProps {
  batchId: string;
  onDismiss: () => void;
}

/** Progress of the hotspots being cut out of the slide, over the viewer (it may be dismissed at any time). */
export default function HotspotBatchNotice({ batchId, onDismiss }: HotspotBatchNoticeProps) {
  const { data: batch } = useHotspotBatch(batchId);
  if (!batch) return null;

  return (
    <div className="hotspot-saved" role="status">
      {batch.status === 'running' && (
        <span className="mono-data">
          Tworzenie hotspotów {batch.done} / {batch.total}…
        </span>
      )}
      {batch.status === 'done' && <span>Utworzono hotspoty: {batch.total}.</span>}
      {batch.status === 'failed' && (
        <span className="hotspot-saved__error">
          Przerwano po {batch.done} z {batch.total}: {batch.error_message}
        </span>
      )}
      <Link to={`/hotspots?folder=${batch.folder_id}`}>Pokaż folder</Link>
      <Button variant="ghost" icon={<X size={14} />} aria-label="Zamknij" onClick={onDismiss} />
    </div>
  );
}
