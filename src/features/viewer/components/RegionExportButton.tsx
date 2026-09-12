import Button from '../../../components/ui/Button';
import { useDownload } from '../../../hooks/useDownload';
import { fetchRegion } from '../../../services/slidesApi';
import type { Slide } from '../../../types/slide';
import { useOsdViewer } from '../hooks/useOsdViewer';
import { getVisibleSlideRect } from '../utils/viewport';

interface RegionExportButtonProps {
  slide: Pick<Slide, 'id' | 'name' | 'width' | 'height' | 'image_offset'>;
  onError: (message: string) => void;
}

/** Downloads the currently visible part of the slide as a PNG (the server caps the output size). */
export default function RegionExportButton({ slide, onError }: RegionExportButtonProps) {
  const viewer = useOsdViewer();
  const { isDownloading, download } = useDownload(onError);

  const exportView = () => {
    if (!viewer || !slide.width || !slide.height) return;
    const region = getVisibleSlideRect(viewer, slide.image_offset, { width: slide.width, height: slide.height });
    if (!region) return;
    const { clientWidth, clientHeight } = viewer.container;
    const maxSize = Math.round(Math.max(clientWidth, clientHeight) * window.devicePixelRatio);
    void download(
      () => fetchRegion(slide.id, { ...region, maxSize }),
      `${slide.name}_x${region.x}_y${region.y}_${region.width}x${region.height}.png`,
      'Nie udało się wyeksportować widoku.',
    );
  };

  return (
    <Button
      variant="primary"
      title="Pobierz widoczny fragment slajdu jako PNG"
      disabled={isDownloading}
      onClick={exportView}
    >
      {isDownloading ? 'Eksport…' : 'Eksport widoku'}
    </Button>
  );
}
