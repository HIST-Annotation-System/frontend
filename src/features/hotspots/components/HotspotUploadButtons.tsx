import { FileImage, FolderUp } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import Button from '../../../components/ui/Button';
import { useHotspotUploadContext } from '../../../context/HotspotUploadProvider';
import { HOTSPOT_IMAGE_ACCEPT, pickHotspotImages } from '../utils/hotspotFiles';
import './Hotspots.css';

interface HotspotUploadButtonsProps {
  folderId: string;
  folderName: string;
}

/**
 * Upload PNG/JPEG files, or every such image inside a chosen folder, into a hotspot folder; progress is
 * shown in the catalog's activity strip.
 */
export default function HotspotUploadButtons({ folderId, folderName }: HotspotUploadButtonsProps) {
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const { isUploading, upload } = useHotspotUploadContext();

  const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const { images, skipped } = pickHotspotImages(event.target.files ?? []);
    // Clearing lets the same files be picked again (e.g. after fixing a failure).
    event.target.value = '';
    void upload(folderId, folderName, images, skipped);
  };

  return (
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
  );
}
