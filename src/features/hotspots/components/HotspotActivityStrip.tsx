import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '../../../components/ui/Button';
import { useHotspotUploadContext } from '../../../context/HotspotUploadProvider';
import type { HotspotBatch } from '../../../types/hotspot';
import { useHotspotBatches } from '../hooks/useHotspots';
import './Hotspots.css';

interface HotspotActivityStripProps {
  onSelectFolder: (folderId: string) => void;
}

/**
 * Hotspots being created right now, whichever way: cut out of slides in the background (running ones, and
 * those that failed recently) and images uploaded from this browser.
 */
export default function HotspotActivityStrip({ onSelectFolder }: HotspotActivityStripProps) {
  const { data: batches = [] } = useHotspotBatches();
  const upload = useHotspotUploadContext();
  const showUpload = upload.isUploading || upload.total + upload.skipped > 0;
  if (!showUpload && batches.length === 0) return null;

  return (
    <ul className="hotspot-activity" aria-label="Tworzenie hotspotów">
      {showUpload && (
        <li className="hotspot-activity__item" role="status">
          <div className="hotspot-activity__row">
            <FolderLink name={upload.folderName} onClick={() => upload.folderId && onSelectFolder(upload.folderId)}>
              Wgrywanie do
            </FolderLink>
            {upload.isUploading ? (
              <>
                <Progress done={upload.done} total={upload.total} />
                <Button variant="ghost" icon={<X size={14} />} title="Przerwij" aria-label="Przerwij przesyłanie" onClick={upload.cancel} />
              </>
            ) : (
              <>
                <span className="hotspot-activity__summary">
                  {upload.total === 0
                    ? 'Brak plików PNG/JPG do wgrania.'
                    : `Wgrano ${upload.done - upload.failures.length} z ${upload.total}${upload.done < upload.total ? ' (przerwano)' : ''}.`}
                  {upload.skipped > 0 && ` Pominięto ${upload.skipped} plików innego typu.`}
                </span>
                <Button variant="ghost" icon={<X size={14} />} aria-label="Zamknij" onClick={upload.reset} />
              </>
            )}
          </div>
          {upload.isUploading && upload.current && (
            <span className="hotspot-activity__current" title={upload.current}>
              {upload.current}
            </span>
          )}
          {upload.failures.length > 0 && (
            <ul className="hotspot-activity__failures">
              {upload.failures.map((failure) => (
                <li key={failure.fileName}>
                  <strong>{failure.fileName}</strong>: {failure.message}
                </li>
              ))}
            </ul>
          )}
        </li>
      )}
      {batches.map((batch) => (
        <BatchItem key={batch.id} batch={batch} onSelectFolder={onSelectFolder} />
      ))}
    </ul>
  );
}

function BatchItem({ batch, onSelectFolder }: { batch: HotspotBatch; onSelectFolder: (folderId: string) => void }) {
  return (
    <li className="hotspot-activity__item" role="status">
      <div className="hotspot-activity__row">
        <FolderLink name={batch.folder_name} onClick={() => onSelectFolder(batch.folder_id)}>
          Ze slajdu „{batch.slide_name}” do
        </FolderLink>
        {batch.status === 'failed' ? (
          <span className="hotspot-activity__summary hotspot-activity__summary--error">
            Przerwano po {batch.done} z {batch.total}: {batch.error_message}
          </span>
        ) : (
          <Progress done={batch.done} total={batch.total} />
        )}
      </div>
    </li>
  );
}

function FolderLink({ name, onClick, children }: { name: string | null; onClick: () => void; children: ReactNode }) {
  return (
    <span className="hotspot-activity__label">
      {children}{' '}
      <button type="button" className="hotspot-activity__folder" onClick={onClick}>
        {name}
      </button>
    </span>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <>
      <span className="mono-data">
        {done} / {total}
      </span>
      <div className="hotspot-activity__progress">
        <div className="hotspot-activity__progress-bar" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
    </>
  );
}
