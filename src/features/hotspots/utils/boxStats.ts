import type { HotspotFeature } from '../../../types/hotspot';

export type FeatureValues = Partial<Record<HotspotFeature, number>>;

export interface FeatureSummary {
  mean: number;
  min: number;
  max: number;
  /** How many boxes had this value. */
  count: number;
}

/** Mean and range of one feature over the boxes whose stats are known; null when none is. */
export const summarizeFeature = (values: readonly FeatureValues[], feature: HotspotFeature): FeatureSummary | null => {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const item of values) {
    const value = item[feature];
    if (value === undefined || !Number.isFinite(value)) continue;
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
    count++;
  }
  return count === 0 ? null : { mean: sum / count, min, max, count };
};

/** Where a value falls between min and max, 0..1 (0.5 when all values are equal). */
export const normalize = (value: number, min: number, max: number): number =>
  max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0.5;

/** Heatmap fill of a box: blue (low) to red (high), translucent so the tissue stays visible. */
export const heatColor = (t: number): string => `hsl(${Math.round(220 - 220 * t)} 85% 50% / 0.4)`;

/** A feature value for the stats panel: few digits, Polish decimal comma. */
export const formatFeature = (value: number): string =>
  value.toLocaleString('pl-PL', { maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2 });
