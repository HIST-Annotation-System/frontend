import { describe, expect, it } from 'vitest';
import { frameToSlideSquare, MIN_HOTSPOT_SIZE } from './hotspotSquare';

const container = { width: 1000, height: 500 };
const slideSize = { width: 100_000, height: 50_000 };
const noOffset = { x: 0, y: 0 };

describe('frameToSlideSquare', () => {
  it('maps the on-screen frame to level-0 pixels', () => {
    // 10 image pixels per screen pixel; frame is 300 px wide at (350, 100).
    const visible = { x: 20_000, y: 10_000, width: 10_000, height: 5_000 };
    const frame = { x: 350, y: 100, width: 300, height: 300 };
    expect(frameToSlideSquare(visible, container, frame, noOffset, slideSize)).toEqual({
      x: 23_500,
      y: 11_000,
      size: 3_000,
    });
  });

  it('adds the image offset', () => {
    const visible = { x: 0, y: 0, width: 1_000, height: 500 };
    const frame = { x: 10, y: 20, width: 100, height: 100 };
    expect(frameToSlideSquare(visible, container, frame, { x: 500, y: 700 }, slideSize)).toEqual({
      x: 510,
      y: 720,
      size: 100,
    });
  });

  it('moves a square hanging over the slide edge back inside', () => {
    const visible = { x: -2_000, y: 49_000, width: 10_000, height: 5_000 };
    const frame = { x: 0, y: 0, width: 300, height: 300 };
    expect(frameToSlideSquare(visible, container, frame, noOffset, slideSize)).toEqual({
      x: 0,
      y: 47_000,
      size: 3_000,
    });
  });

  it('shrinks a square larger than the slide to its shorter side', () => {
    const visible = { x: -500_000, y: -100_000, width: 1_000_000, height: 500_000 };
    const frame = { x: 350, y: 100, width: 300, height: 300 };
    expect(frameToSlideSquare(visible, container, frame, noOffset, slideSize)).toEqual({
      x: 0,
      y: 0,
      size: 50_000,
    });
  });

  it('rejects squares that are too small', () => {
    const visible = { x: 0, y: 0, width: 100, height: 50 };
    const frame = { x: 0, y: 0, width: (MIN_HOTSPOT_SIZE - 1) * 10, height: 1 };
    expect(frameToSlideSquare(visible, container, frame, noOffset, slideSize)).toBeNull();
  });
});
