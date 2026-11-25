import { useState, type DragEvent } from 'react';
import { useHotspotUploadContext } from '../../../context/HotspotUploadProvider';
import { pickDroppedHotspotImages, pickHotspotImages } from '../utils/hotspotFiles';

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

/**
 * Images or whole folders dropped on the catalog list are uploaded into `folder`, like the "Wgraj" button does.
 * With every folder listed (no `folder`) a drop is refused and the list asks to pick a folder first. While an upload
 * runs (or a dropped folder is still being read) a drop is refused too. A refused drop is still caught, so the browser
 * does not open the file instead (leaving the page and ending a running upload). Without `enabled` nothing is handled.
 */
export function useHotspotDrop(folder: { id: string; name: string } | null, enabled: boolean) {
  const { isUploading, upload } = useHotspotUploadContext();
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);

  if (!enabled) return { isDragging: false, dropHandlers: {} };
  const busy = isUploading || isReading;

  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (busy) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      if (folder === null) event.dataTransfer.dropEffect = 'none';
      setIsDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      // Leaving for a child element is not leaving the list.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setIsDragging(false);
      if (busy || folder === null) return;
      setIsReading(true);
      // Without folder access the dropped files themselves still go (a dropped folder is then skipped).
      const plain = pickHotspotImages(event.dataTransfer.files);
      void pickDroppedHotspotImages(event.dataTransfer)
        .catch(() => plain)
        .then(({ images, skipped }) => {
          const running = upload(folder.id, folder.name, images, skipped);
          setIsReading(false);
          return running;
        });
    },
  };
  return { isDragging: isDragging && !busy, dropHandlers };
}
