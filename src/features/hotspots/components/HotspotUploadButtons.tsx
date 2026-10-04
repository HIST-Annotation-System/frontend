import { FileImage, FolderUp, X } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import Button from '../../../components/ui/Button';
import { useHotspotUpload } from '../hooks/useHotspotUpload';
import { HOTSPOT_IMAGE_ACCEPT, pickHotspotImages } from '../utils/hotspotFiles';
import './Hotspots.css';

interface HotspotUploadButtonsProps {
  folderId: string;
  folderName: string;
}

/** Upload PNG/JPEG files, or every such image inside a chosen folder, into a hotspot folder. */
export default function HotspotUploadButtons({ folderId, folderName }: HotspotUploadButtonsProps) {
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const { isUploading, done, total, current, failures, skipped, upload, cancel, reset } = useHotspotUpload();
  const finished = !isUploading && total + skipped > 0;

  const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const { images, skipped: skippedCount } = pickHotspotImages(event.target.files ?? []);
    // Clearing lets the same files be picked again (e.g. after fixing a failure).
    event.target.value = '';
    void upload(folderId, images, skippedCount);
  };

  return (
    <div className="hotspot-upload">
      <div className="hotspot-upload__buttons">
        <Button
          icon={<FileImage size={16} />}
          disabled={isUploading}
          title={`Wgraj obrazy PNG/JPG do folderu „${folderName}”`}
          onClick={() => filesInput.current?.click()}
        >
          Wgraj pliki
        </Button>
        <Button
          icon={<FolderUp size={16} />}
          disabled={isUploading}
          title={`Wgraj wszystkie obrazy PNG/JPG z wybranego katalogu (także z podkatalogów) do folderu „${folderName}”`}
          onClick={() => folderInput.current?.click()}
        >
          Wgraj folder
        </Button>
        <input ref={filesInput} type="file" accept={HOTSPOT_IMAGE_ACCEPT} multiple hidden onChange={handlePicked} />
        <input
          // `webkitdirectory` (all major browsers) is not a React prop, so it is set on the element.
          ref={(input) => {
            folderInput.current = input;
            if (input) input.webkitdirectory = true;
          }}
          type="file"
          multiple
          hidden
          onChange={handlePicked}
        />
      </div>

      {(isUploading || finished) && (
        <div className="hotspot-upload__status" role="status">
          {isUploading ? (
            <>
              <div className="hotspot-upload__progress-row">
                <span className="mono-data">
                  {done} / {total}
                </span>
                <div className="slide-card__progress">
                  <div className="slide-card__progress-bar" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </div>
                <Button variant="ghost" icon={<X size={14} />} title="Przerwij" aria-label="Przerwij przesyłanie" onClick={cancel} />
              </div>
              {current && <span className="hotspot-upload__current" title={current}>{current}</span>}
            </>
          ) : (
            <div className="hotspot-upload__progress-row">
              <span>
                {total === 0
                  ? 'Brak plików PNG/JPG do wgrania.'
                  : `Wgrano ${done - failures.length} z ${total}${done < total ? ' (przerwano)' : ''}.`}
                {skipped > 0 && ` Pominięto ${skipped} plików innego typu.`}
              </span>
              <Button variant="ghost" icon={<X size={14} />} aria-label="Zamknij" onClick={reset} />
            </div>
          )}
          {failures.length > 0 && (
            <ul className="hotspot-upload__failures">
              {failures.map((failure) => (
                <li key={failure.fileName}>
                  <strong>{failure.fileName}</strong>: {failure.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
