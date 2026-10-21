import Button from '../../../components/ui/Button';
import { useDownload } from '../../../hooks/useDownload';
import { fetchAnnotationsGeoJson } from '../../../services/annotationsApi';
import type { AnnotationOwner } from '../../../types/annotation';

interface ExportAnnotationsButtonProps {
  owner: AnnotationOwner;
  /** Name of the slide or hotspot, used in the downloaded file's name. */
  name: string;
  onError: (message: string) => void;
}

export default function ExportAnnotationsButton({ owner, name, onError }: ExportAnnotationsButtonProps) {
  const { isDownloading, download } = useDownload(onError);

  return (
    <Button
      small
      title="Anotacje jako GeoJSON, zgodny z QuPath"
      disabled={isDownloading}
      onClick={() =>
        void download(
          () => fetchAnnotationsGeoJson(owner),
          `annotations_${name}.geojson`,
          'Nie udało się wyeksportować anotacji.',
        )
      }
    >
      {isDownloading ? 'Eksportowanie…' : 'Eksportuj GeoJSON'}
    </Button>
  );
}
