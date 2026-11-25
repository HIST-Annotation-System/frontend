import { describe, expect, it } from 'vitest';
import type { Tag } from '../../../types/tag';
import { customWeightCap, maxCustomWeight, tagTone } from './hotspotTags';

const tag = (id: number, dimension: Tag['dimension'], weight: number): Tag => ({ id, name: `t${id}`, dimension, weight });

const CORE = [
  tag(1, 'importance', 100),
  tag(2, 'importance', 50),
  tag(3, 'importance', 10),
  tag(4, 'accuracy', 100),
  tag(5, 'accuracy', 0),
];

describe('hotspot tags', () => {
  it('caps custom weights below the lightest non-zero core tag', () => {
    expect(customWeightCap([...CORE, tag(6, null, 9)])).toBe(10);
    expect(maxCustomWeight(CORE)).toBe(9);
  });

  it('has no cap when no core tag weighs anything', () => {
    expect(customWeightCap([tag(5, 'accuracy', 0)])).toBeNull();
    expect(maxCustomWeight([])).toBe(1000);
  });

  it('highlights wrong annotations and the highest importance', () => {
    expect(CORE.map((item) => tagTone(item, CORE))).toEqual(['danger', 'info', 'info', 'danger', 'success']);
    expect(tagTone(tag(6, null, 3), CORE)).toBe('neutral');
  });
});
