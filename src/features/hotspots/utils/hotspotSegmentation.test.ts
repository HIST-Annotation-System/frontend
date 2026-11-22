import { describe, expect, it } from 'vitest';
import { segmentationLabel, uncertaintyLabel } from './hotspotSegmentation';

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

describe('uncertaintyLabel', () => {
  it('shows how unsure the model is, as a percentage', () => {
    expect(uncertaintyLabel(0.83, false)).toBe('17%');
    expect(uncertaintyLabel(1, false)).toBe('0%');
  });

  it('shows a dash before the model has reported it, and a note while it is being rescored', () => {
    expect(uncertaintyLabel(null, false)).toBe('—');
    expect(uncertaintyLabel(undefined, undefined)).toBe('—');
    expect(uncertaintyLabel(0.5, true)).toBe('Przeliczanie…');
  });
});
