import { ChevronDown, FolderOpen, Images } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useHotspotUploadContext } from '../../../context/HotspotUploadProvider';
import { useDismiss } from '../../../hooks/useDismiss';
import { HOTSPOT_IMAGE_ACCEPT, pickHotspotImages } from '../utils/hotspotFiles';
import './Hotspots.css';

interface HotspotUploaderProps {
  folderId: string;
  folderName: string;
}

/**
 * One "Wgraj" button for a hotspot folder: it opens a choice of images or a whole folder (with its subfolders).
 * Images can also be dropped on the list; progress is shown in the catalog's activity strip.
 */
export default function HotspotUploader({ folderId, folderName }: HotspotUploaderProps) {
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { isUploading, upload } = useHotspotUploadContext();

  useDismiss(isMenuOpen, menuRoot, () => setIsMenuOpen(false));

  const choose = (input: RefObject<HTMLInputElement | null>) => {
    setIsMenuOpen(false);
    input.current?.click();
  };

  const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const { images, skipped } = pickHotspotImages(event.target.files ?? []);
    // Clearing lets the same files be picked again (e.g. after fixing a failure).
    event.target.value = '';
    void upload(folderId, folderName, images, skipped);
  };

  return (
    <div className="hotspot-upload">
      <div className="hotspot-upload__root" ref={menuRoot}>
        <Button
          variant="primary"
          disabled={isUploading}
          title={`Wgraj obrazy do folderu „${folderName}”`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          Wgraj
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
        {isMenuOpen && (
          <div className="hotspot-upload__menu" role="menu" aria-label="Wgraj">
            <button type="button" role="menuitem" className="hotspot-upload__item" onClick={() => choose(filesInput)}>
              <Images size={15} aria-hidden="true" />
              Obrazy…
            </button>
            <button type="button" role="menuitem" className="hotspot-upload__item" onClick={() => choose(folderInput)}>
              <FolderOpen size={15} aria-hidden="true" />
              Folder…
            </button>
          </div>
        )}
      </div>
      <button type="button" className="link-button" onClick={() => setIsGuideOpen(true)}>
        Obsługiwane formaty
      </button>

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
      <Modal title="Obsługiwane formaty i sposób wgrywania" open={isGuideOpen} onClose={() => setIsGuideOpen(false)}>
        <ul className="hotspot-upload__guide">
          <li>Obrazy PNG i JPEG (.png, .jpg, .jpeg). Każdy obraz staje się osobnym hotspotem z nazwą pliku.</li>
          <li>„Folder…” wgrywa wszystkie obrazy z wybranego katalogu, także z podkatalogów. Inne pliki są pomijane.</li>
          <li>Obrazy i całe foldery można też przeciągnąć na listę hotspotów.</li>
          <li>
            Plik może mieć do 100 MB. Obraz dłuższy niż 8192 px zostaje zmniejszony, a obraz większy niż 100 mln pikseli
            zostaje odrzucony.
          </li>
        </ul>
      </Modal>
    </div>
  );
}
