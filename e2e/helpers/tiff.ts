import { deflateSync } from 'node:zlib';

// A tiny valid tiled TIFF, built in memory, so the upload tests need no slide file in the repository. OpenSlide reads
// any tiled TIFF. The image is one level of deflate-compressed RGB tiles of a single colour, and every tile points at
// the same compressed bytes, so even a large slide is only a few hundred bytes.
const TILE = 256;
const SHORT = 3;
const LONG = 4;
const RATIONAL = 5;
const PIXELS_PER_CM = 40_000; // 0.25 micron per pixel

interface TiffOptions {
  /** Side of the square image in pixels; a multiple of 256 (default 256). */
  size?: number;
  color?: [number, number, number];
  /** Leave out the resolution tags: the backend refuses such a slide. */
  withResolution?: boolean;
}

export function makeTiledTiff({ size = TILE, color = [200, 120, 170], withResolution = true }: TiffOptions = {}): Buffer {
  const raw = Buffer.alloc(TILE * TILE * 3);
  for (let i = 0; i < raw.length; i += 3) raw.set(color, i);
  const tile = deflateSync(raw);
  const tiles = (size / TILE) ** 2;

  const headerSize = 8;
  const chunks: Buffer[] = [];
  let offset = headerSize;
  const place = (data: Buffer) => {
    const at = offset;
    chunks.push(data);
    offset += data.length + (data.length % 2); // keep every block on an even offset
    if (data.length % 2) chunks.push(Buffer.alloc(1));
    return at;
  };

  const tileOffset = place(tile);
  const bitsOffset = place(Buffer.from(new Uint16Array([8, 8, 8]).buffer));
  const longs = (values: number[]) => Buffer.from(new Uint32Array(values).buffer);
  const tileOffsetsValue = tiles === 1 ? tileOffset : place(longs(Array(tiles).fill(tileOffset)));
  const byteCountsValue = tiles === 1 ? tile.length : place(longs(Array(tiles).fill(tile.length)));
  const resolution = longs([PIXELS_PER_CM, 1]);
  const xResolutionOffset = withResolution ? place(resolution) : 0;
  const yResolutionOffset = withResolution ? place(resolution) : 0;

  type Entry = [tag: number, type: number, count: number, value: number];
  const entries: Entry[] = [
    [256, LONG, 1, size], // ImageWidth
    [257, LONG, 1, size], // ImageLength
    [258, SHORT, 3, bitsOffset], // BitsPerSample
    [259, SHORT, 1, 8], // Compression: deflate
    [262, SHORT, 1, 2], // PhotometricInterpretation: RGB
    [277, SHORT, 1, 3], // SamplesPerPixel
    ...(withResolution
      ? ([
          [282, RATIONAL, 1, xResolutionOffset], // XResolution
          [283, RATIONAL, 1, yResolutionOffset], // YResolution
        ] satisfies Entry[])
      : []),
    [284, SHORT, 1, 1], // PlanarConfiguration: chunky
    ...(withResolution ? ([[296, SHORT, 1, 3]] satisfies Entry[]) : []), // ResolutionUnit: centimeter
    [322, LONG, 1, TILE], // TileWidth
    [323, LONG, 1, TILE], // TileLength
    [324, LONG, tiles, tileOffsetsValue], // TileOffsets
    [325, LONG, tiles, byteCountsValue], // TileByteCounts
  ];

  const ifd = Buffer.alloc(2 + entries.length * 12 + 4);
  ifd.writeUInt16LE(entries.length, 0);
  entries.forEach(([tag, type, count, value], index) => {
    const at = 2 + index * 12;
    ifd.writeUInt16LE(tag, at);
    ifd.writeUInt16LE(type, at + 2);
    ifd.writeUInt32LE(count, at + 4);
    if (type === SHORT && count === 1) ifd.writeUInt16LE(value, at + 8);
    else ifd.writeUInt32LE(value, at + 8);
  });
  const ifdOffset = place(ifd);

  const header = Buffer.alloc(headerSize);
  header.write('II', 0, 'ascii');
  header.writeUInt16LE(42, 2);
  header.writeUInt32LE(ifdOffset, 4);

  return Buffer.concat([header, ...chunks]);
}
