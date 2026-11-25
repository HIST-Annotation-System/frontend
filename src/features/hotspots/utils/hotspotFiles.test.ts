import { describe, expect, it } from 'vitest';
import { isHotspotImageFile, pickHotspotImages } from './hotspotFiles';

const file = (name: string, path = '') => {
  const result = new File(['x'], name);
  Object.defineProperty(result, 'webkitRelativePath', { value: path });
  return result;
};

describe('hotspot files', () => {
  it('accepts PNG and JPEG names in any case', () => {
    expect(['a.png', 'b.JPG', 'c.jpeg', 'd.Jpeg'].map((name) => isHotspotImageFile({ name }))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('rejects other files and hidden files', () => {
    expect(['a.tif', 'b.gif', 'notes.txt', 'png', '._photo.jpg', '.DS_Store'].some((name) => isHotspotImageFile({ name }))).toBe(
      false,
    );
  });

  it('keeps only images from a folder, in natural path order', () => {
    const { images, skipped } = pickHotspotImages([
      file('img10.png', 'set/img10.png'),
      file('Thumbs.db', 'set/Thumbs.db'),
      file('img2.png', 'set/img2.png'),
      file('a.jpg', 'set/sub/a.jpg'),
    ]);
    expect(images.map((item) => item.webkitRelativePath)).toEqual(['set/img2.png', 'set/img10.png', 'set/sub/a.jpg']);
    expect(skipped).toBe(1);
  });
});
