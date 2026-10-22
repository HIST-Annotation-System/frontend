import { useUpload } from '../../../context/UploadProvider';
import type { Slide } from '../../../types/slide';
import { progressPercent } from '../../upload/utils/uploadProgress';

/** A slide's upload/ingest progress: live from this tab's own upload queue, otherwise as last reported by the server. */
export function useSlideProgress(): (slide: Slide) => number | null {
  const { items } = useUpload();
  return (slide) => {
    if (slide.status === 'processing') return slide.ingest_progress;
    if (slide.status !== 'uploading') return null;
    const ownUpload = items.find((item) => item.slideId === slide.id && item.status !== 'completed');
    return ownUpload && ownUpload.status !== 'queued' ? progressPercent(ownUpload) : slide.ingest_progress;
  };
}
