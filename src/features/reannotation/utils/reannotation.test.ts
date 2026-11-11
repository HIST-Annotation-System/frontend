import { describe, expect, it } from 'vitest';
import type { ReannotationSummary } from '../../../types/reannotation';
import { gateLabel, gatingValue, progressLabel } from './reannotation';

const summary = (changes: Partial<ReannotationSummary> = {}): ReannotationSummary => ({
  layered: true,
  my_status: null,
  started_count: 0,
  confirmed_count: 0,
  metric: null,
  threshold: null,
  kappa: null,
  iou: null,
  ...changes,
});

describe('reannotation labels', () => {
  it('counts the confirmations of a hotspot in layers', () => {
    expect(progressLabel({ reannotation: summary(), reannotated_at: null })).toBe('Nie rozpoczęto');
    expect(progressLabel({ reannotation: summary({ started_count: 2 }), reannotated_at: null })).toBe(
      'Zatwierdziło 0 z 3',
    );
    expect(progressLabel({ reannotation: summary({ started_count: 2, confirmed_count: 2 }), reannotated_at: null })).toBe(
      'Zatwierdziło 2 z 3',
    );
    expect(progressLabel({ reannotation: summary({ confirmed_count: 3 }), reannotated_at: '2026-11-12' })).toBe('Poprawione');
  });

  it('has no progress for a hotspot marked reannotated by hand', () => {
    expect(progressLabel({ reannotation: summary({ layered: false }), reannotated_at: null })).toBeNull();
  });

  it('shows the gating figure against the threshold once there is one', () => {
    const judged = summary({ metric: 'kappa', threshold: 0.6, kappa: 0.516, iou: 0.9, confirmed_count: 3 });
    expect(gateLabel(judged)).toBe('κ Fleissa 0.52 / 0.60');
    expect(gateLabel({ ...judged, metric: 'iou' })).toBe('IoU 0.90 / 0.60');
    expect(gatingValue({ ...judged, metric: 'iou' })).toBe(0.9);
    expect(gateLabel(summary())).toBeNull();
  });
});
