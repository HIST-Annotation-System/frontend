import { CircleHelp } from 'lucide-react';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { ACCEPTED_UPLOAD_EXTENSIONS } from '../slideFileRules';
import SlideFormatGuide from './SlideFormatGuide';
import './WsiUploader.css';

interface WsiUploaderProps {
  onFiles: (files: Iterable<File>) => number;
  organizationPicker?: ReactNode;
  /** Filled with a function that opens the file picker, for other buttons on the page (the empty library's). */
  pickerRef?: RefObject<(() => void) | null>;
}

/** Header button for adding slides; the library page shows the queue and accepts dropped files itself. */
export default function WsiUploader({ onFiles, organizationPicker, pickerRef }: WsiUploaderProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  if (pickerRef) pickerRef.current = () => inputRef.current?.click();

  const enqueue = (files: Iterable<File>) => {
    const skipped = onFiles(files);
    setQueueNotice(skipped > 0 ? `Pominięto pliki już dodane do kolejki: ${skipped}.` : null);
  };

  return (
    <div className="wsi-uploader">
      <div className="wsi-uploader__buttons">
        {organizationPicker}
        <Button
          icon={<CircleHelp size={16} aria-hidden="true" />}
          variant="ghost"
          aria-label="Obsługiwane formaty"
          title="Obsługiwane formaty"
          onClick={() => setIsGuideOpen(true)}
        />
        <Button variant="primary" onClick={() => inputRef.current?.click()}>
          Wgraj
        </Button>
      </div>
      {queueNotice && <p className="wsi-uploader__message" role="status">{queueNotice}</p>}

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
