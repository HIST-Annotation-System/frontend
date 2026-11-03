import type { Hotspot, SegmentationStatus } from '../../../types/hotspot';

const SEGMENTATION_LABELS: Record<SegmentationStatus, string> = {
  pending: 'Oczekuje na model',
  done: 'Gotowe',
  failed: 'Błąd',
  skipped: 'Pominięto (anotacje ręczne)',
};

/** How far the model's run on a hotspot got; annotating works the same in every state. */
export function segmentationLabel({
  segmentation_status: status,
  segmentation_error: error,
}: Pick<Hotspot, 'segmentation_status' | 'segmentation_error'>): string {
  const label = SEGMENTATION_LABELS[status];
  return status === 'failed' && error ? `${label}: ${error}` : label;
}
