import { CircleAlert, CircleCheck, X } from 'lucide-react';
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
  const percent = batch.total > 0 ? Math.round((batch.done / batch.total) * 100) : 0;

  return (
    <div className="hotspot-saved" role="status">
      {batch.status === 'running' && (
        <>
          <span className="hotspot-saved__spinner" aria-hidden="true" />
          <div className="hotspot-saved__progress">
            <div className="hotspot-saved__line">
              <span className="hotspot-saved__title">Tworzenie hotspotów</span>
              <span className="mono-data">
                {batch.done} / {batch.total}
              </span>
            </div>
            <div className="hotspot-saved__track">
              <div className="hotspot-saved__fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </>
      )}
      {batch.status === 'done' && (
        <span className="hotspot-saved__text">
          <CircleCheck size={16} className="hotspot-saved__ok" aria-hidden="true" />
          Utworzono hotspoty: {batch.total}.
        </span>
      )}
      {batch.status === 'failed' && (
        <span className="hotspot-saved__text hotspot-saved__error">
          <CircleAlert size={16} aria-hidden="true" />
          Przerwano po {batch.done} z {batch.total}: {batch.error_message}
        </span>
      )}
      <Link to={`/hotspots?folder=${batch.folder_id}`}>Pokaż folder</Link>
      <Button variant="ghost" icon={<X size={14} />} aria-label="Zamknij" onClick={onDismiss} />
    </div>
  );
}
