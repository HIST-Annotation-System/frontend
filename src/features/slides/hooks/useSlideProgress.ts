import { useUpload } from '../../../context/UploadProvider';
import type { Slide } from '../../../types/slide';
import { progressPercent } from '../../upload/utils/uploadProgress';

/** Upload or processing progress: live from this tab's own queue, otherwise as last reported by the server. */
export function useSlideProgress() {
  const { items } = useUpload();
  return (slide: Slide): number | null => {
    if (slide.status !== 'uploading') return slide.ingest_progress;
    const own = items.find((item) => item.slideId === slide.id && item.status !== 'completed');
    return own && own.status !== 'queued' ? progressPercent(own) : slide.ingest_progress;
  };
}
