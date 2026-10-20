import { ImageDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useDownload } from '../../../hooks/useDownload';
import { fetchAnnotationsGeoJson } from '../../../services/annotationsApi';
import type { AnnotationOwner } from '../../../types/annotation';

const EXPORT_LABEL = 'Eksport anotacji (GeoJSON, zgodny z QuPath)';

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
      icon={<ImageDown size={16} />}
      title={isDownloading ? 'Eksport…' : EXPORT_LABEL}
      aria-label={EXPORT_LABEL}
      disabled={isDownloading}
      onClick={() =>
        void download(
          () => fetchAnnotationsGeoJson(owner),
          `annotations_${name}.geojson`,
          'Nie udało się wyeksportować anotacji.',
        )
      }
    />
  );
}
