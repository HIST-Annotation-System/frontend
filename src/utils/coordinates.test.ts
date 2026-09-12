import { describe, expect, it } from 'vitest';
import {
  clampRect,
  imageToSlidePosition,
  imageToSlideRect,
  slideToImagePosition,
  slideToImageRect,
} from './coordinates';

const offset = { x: 1200, y: 800 };

describe('coordinates', () => {
  it('converts positions between image and slide space', () => {
    expect(imageToSlidePosition([10, 20], offset)).toEqual([1210, 820]);
    expect(slideToImagePosition([1210, 820], offset)).toEqual([10, 20]);
  });

  it('round-trips rectangles', () => {
    const rect = { x: 5, y: 6, width: 100, height: 50 };
    expect(slideToImageRect(imageToSlideRect(rect, offset), offset)).toEqual(rect);
  });

  it('clamps rectangles to the slide area', () => {
    expect(clampRect({ x: -10, y: -5, width: 50, height: 30 }, 100, 100)).toEqual({ x: 0, y: 0, width: 40, height: 25 });
    expect(clampRect({ x: 90.4, y: 10, width: 50, height: 10 }, 100, 100)).toEqual({ x: 90, y: 10, width: 10, height: 10 });
    expect(clampRect({ x: 200, y: 0, width: 10, height: 10 }, 100, 100)).toBeNull();
  });
});
