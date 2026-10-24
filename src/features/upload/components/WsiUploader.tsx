import { useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useUpload } from '../../../context/UploadProvider';
import { ACCEPTED_UPLOAD_EXTENSIONS } from '../slideFileRules';
import SlideFormatGuide from './SlideFormatGuide';
import './WsiUploader.css';

/** Header button for adding slides; the library page shows the queue and accepts dropped files itself. */
export default function WsiUploader() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { enqueue: addToQueue } = useUpload();
  const [queueNotice, setQueueNotice] = useState<string | null>(null);

  const enqueue = (files: Iterable<File>) => {
    const skipped = addToQueue(files);
    setQueueNotice(skipped > 0 ? `Pominięto pliki już dodane do kolejki: ${skipped}.` : null);
  };

  return (
    <div className="wsi-uploader">
      <div className="wsi-uploader__buttons">
        <Button variant="primary" onClick={() => inputRef.current?.click()}>
          Wgraj
        </Button>
        <button type="button" className="link-button" onClick={() => setIsGuideOpen(true)}>
          Obsługiwane formaty
        </button>
      </div>
      {queueNotice && <p className="wsi-uploader__message">{queueNotice}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_UPLOAD_EXTENSIONS.join(',')}
        hidden
        onChange={(event) => {
          enqueue(event.target.files ?? []);
          // Allows picking the same file again (e.g. after removing it from the queue).
          event.target.value = '';
        }}
      />
      <Modal title="Obsługiwane formaty i sposób wgrywania" open={isGuideOpen} onClose={() => setIsGuideOpen(false)}>
        <SlideFormatGuide />
      </Modal>
    </div>
  );
}
