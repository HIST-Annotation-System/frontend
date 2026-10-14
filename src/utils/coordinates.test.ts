import { describe, expect, it } from 'vitest';
import { imageToSlidePosition, slideToImagePosition, slideToImageRect } from './coordinates';

const offset = { x: 1200, y: 800 };

describe('coordinates', () => {
  it('converts positions between image and slide space', () => {
    expect(imageToSlidePosition([10, 20], offset)).toEqual([1210, 820]);
    expect(slideToImagePosition([1210, 820], offset)).toEqual([10, 20]);
  });

  it('moves rectangles from slide to image space', () => {
    expect(slideToImageRect({ x: 1205, y: 806, width: 100, height: 50 }, offset)).toEqual({ x: 5, y: 6, width: 100, height: 50 });
  });
});
