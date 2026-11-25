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

/**
 * How unsure the model is of a hotspot's cells (1 - its mean confidence), as a percentage; a dash before it is known,
 * and a note while its folder is being rescored.
 */
export function uncertaintyLabel(confidence: number | null | undefined, pending: boolean | undefined): string {
  if (pending) return 'Przeliczanie…';
  if (confidence === null || confidence === undefined) return '—';
  return `${Math.round((1 - confidence) * 100)}%`;
}
