import { describe, expect, it } from 'vitest';
import {
  availablePresets,
  formatMagnification,
  formatZoomPercent,
  getNativeMagnification,
  imageZoomToMagnification,
  magnificationToImageZoom,
} from './magnification';

describe('magnification', () => {
  it('prefers the objective power and falls back to the pixel size', () => {
    expect(getNativeMagnification({ objective_power: 20, mpp_x: 0.25 })).toBe(20);
    expect(getNativeMagnification({ objective_power: null, mpp_x: 0.25 })).toBe(40);
    expect(getNativeMagnification({ objective_power: null, mpp_x: 0.499 })).toBe(20);
    expect(getNativeMagnification({ objective_power: null, mpp_x: null })).toBeNull();
  });

  it('offers presets up to the native magnification', () => {
    expect(availablePresets(20)).toEqual([1, 2, 5, 10, 20]);
    expect(availablePresets(40)).toEqual([1, 2, 5, 10, 20, 40]);
    expect(availablePresets(null)).toEqual([]);
  });

  it('converts between image zoom and magnification', () => {
    expect(imageZoomToMagnification(0.37, 20)).toBeCloseTo(7.4);
    expect(magnificationToImageZoom(5, 20)).toBe(0.25);
  });

  it('formats readouts', () => {
    expect(formatMagnification(7.4)).toBe('7.4×');
    expect(formatMagnification(20)).toBe('20×');
    expect(formatZoomPercent(0.37)).toBe('37%');
    expect(formatZoomPercent(0.004)).toBe('0.4%');
  });
});
