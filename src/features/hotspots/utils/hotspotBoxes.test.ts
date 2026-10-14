import { describe, expect, it } from 'vitest';
import {
  brushBoxAt,
  dragRange,
  gridBoxAt,
  HOTSPOT_BOX_SIZE as S,
  isCentredIn,
  overlaps,
  rangeBoxes,
  rangeRect,
  strokePoints,
} from './hotspotBoxes';

const slideSize = { width: 10 * S, height: 5 * S };
const origin = { x: 1000, y: 2000 };

describe('dragRange', () => {
  it('has one box as soon as the first drag starts (at the grid origin)', () => {
    expect(dragRange(origin, [1000, 2000], [1000, 2000])).toEqual({ rows: [0, 0], cols: [0, 0] });
  });

  it('adds a column or row each time the pointer crosses another box side', () => {
    expect(dragRange(origin, [1000, 2000], [1000 + S, 2000 + S - 1])).toEqual({ rows: [0, 0], cols: [0, 0] });
    expect(dragRange(origin, [1000, 2000], [1000 + S + 1, 2000 + 2 * S + 1])).toEqual({ rows: [0, 2], cols: [0, 1] });
  });

  it('grows from the start point in every direction', () => {
    expect(dragRange(origin, [1000, 2000], [1000 - S - 1, 2010])).toEqual({ rows: [0, 0], cols: [-2, -1] });
    expect(dragRange(origin, [1000, 2000], [1010, 1990])).toEqual({ rows: [-1, -1], cols: [0, 0] });
  });

  it('keeps later drags on the same grid', () => {
    const start: [number, number] = [1000 + 2.5 * S, 2000 + 1.5 * S];
    const end: [number, number] = [1000 + 4.2 * S, 2000 + 2.1 * S];
    expect(dragRange(origin, start, end)).toEqual({ rows: [1, 2], cols: [2, 4] });
    expect(rangeRect(origin, { rows: [1, 2], cols: [2, 4] })).toEqual({ x: 1000 + 2 * S, y: 2000 + S, width: 3 * S, height: 2 * S });
  });
});

describe('gridBoxAt', () => {
  it('is the grid box under a point', () => {
    expect(gridBoxAt(origin, [1000 + 1.5 * S, 2000 - 1])).toEqual({ x: 1000 + S, y: 2000 - S });
  });
});

describe('rangeBoxes', () => {
  it('lists the boxes row by row', () => {
    expect(rangeBoxes(origin, { rows: [0, 1], cols: [0, 1] }, slideSize)).toEqual([
      { x: 1000, y: 2000 },
      { x: 1000 + S, y: 2000 },
      { x: 1000, y: 2000 + S },
      { x: 1000 + S, y: 2000 + S },
    ]);
  });

  it('leaves out boxes not wholly inside the slide', () => {
    expect(rangeBoxes(origin, { rows: [-2, -1], cols: [-1, 0] }, slideSize)).toEqual([{ x: 1000, y: 2000 - S }]);
  });

  it('refuses more boxes than the limit', () => {
    expect(rangeBoxes({ x: 0, y: 0 }, { rows: [0, 4], cols: [0, 9] }, slideSize, 49)).toBeNull();
    expect(rangeBoxes({ x: 0, y: 0 }, { rows: [0, 4], cols: [0, 9] }, slideSize, 50)).toHaveLength(50);
  });
});

describe('brush', () => {
  it('centres the box on the pointer, inside the slide', () => {
    expect(brushBoxAt([5000, 3000], slideSize)).toEqual({ x: 5000 - S / 2, y: 3000 - S / 2 });
    expect(brushBoxAt([10, 5 * S - 10], slideSize)).toEqual({ x: 0, y: 4 * S });
    expect(brushBoxAt([10, 10], { width: S - 1, height: S })).toBeNull();
  });

  it('tells overlapping boxes apart from touching ones', () => {
    expect(overlaps({ x: 0, y: 0 }, { x: S - 1, y: 0 })).toBe(true);
    expect(overlaps({ x: 0, y: 0 }, { x: S, y: 0 })).toBe(false);
  });

  it('samples a fast stroke densely enough', () => {
    const points = strokePoints([0, 0], [S, 0]);
    expect(points).toHaveLength(4);
    expect(points.at(-1)).toEqual([S, 0]);
  });
});

describe('isCentredIn', () => {
  it('picks boxes whose centre lies in the area', () => {
    const area = { x: 0, y: 0, width: S, height: S };
    expect(isCentredIn({ x: -S / 2 + 1, y: 0 }, area)).toBe(true);
    expect(isCentredIn({ x: S / 2, y: 0 }, area)).toBe(false);
  });
});
