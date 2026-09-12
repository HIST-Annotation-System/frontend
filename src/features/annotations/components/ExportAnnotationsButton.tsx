import Button from '../../../components/ui/Button';
import { useDownload } from '../../../hooks/useDownload';
import { fetchAnnotationsGeoJson } from '../../../services/annotationsApi';
import type { Slide } from '../../../types/slide';

interface ExportAnnotationsButtonProps {
  slide: Pick<Slide, 'id' | 'name'>;
  onError: (message: string) => void;
}

export default function ExportAnnotationsButton({ slide, onError }: ExportAnnotationsButtonProps) {
  const { isDownloading, download } = useDownload(onError);

  return (
    <Button
      variant="primary"
      title="Eksportuj anotacje do GeoJSON (zgodny z QuPath)"
      disabled={isDownloading}
      onClick={() =>
        void download(
          () => fetchAnnotationsGeoJson(slide.id),
          `annotations_${slide.name}.geojson`,
          'Nie udało się wyeksportować anotacji.',
        )
      }
    >
      GeoJSON
    </Button>
  );
}
