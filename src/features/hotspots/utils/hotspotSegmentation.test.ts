import { describe, expect, it } from 'vitest';
import { segmentationLabel } from './hotspotSegmentation';

describe('segmentationLabel', () => {
  it('names each status', () => {
    expect(segmentationLabel({ segmentation_status: 'pending', segmentation_error: null })).toBe('Oczekuje na model');
    expect(segmentationLabel({ segmentation_status: 'done', segmentation_error: null })).toBe('Gotowe');
    expect(segmentationLabel({ segmentation_status: 'skipped', segmentation_error: null })).toContain('Pominięto');
  });

  it('includes the reason of a failure', () => {
    expect(segmentationLabel({ segmentation_status: 'failed', segmentation_error: 'Brak pamięci' })).toBe(
      'Błąd: Brak pamięci',
    );
    expect(segmentationLabel({ segmentation_status: 'failed', segmentation_error: null })).toBe('Błąd');
  });
});
