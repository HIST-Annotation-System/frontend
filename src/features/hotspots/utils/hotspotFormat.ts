const UM_PER_MM = 1000;

/** Physical length for a number of pixels at `mpp` microns per pixel, e.g. "750 µm" or "1.2 mm". */
export const formatLength = (pixels: number, mpp: number): string => {
  const microns = pixels * mpp;
  return microns >= UM_PER_MM
    ? `${(microns / UM_PER_MM).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} mm`
    : `${Math.round(microns).toLocaleString('pl-PL')} µm`;
};

/** "3 000 × 3 000 px · 750 µm" (the physical side only when the resolution is known). */
export const formatSquareSize = (size: number, mpp: number | null): string => {
  const pixels = `${size.toLocaleString('pl-PL')} × ${size.toLocaleString('pl-PL')} px`;
  return mpp ? `${pixels} · ${formatLength(size, mpp)}` : pixels;
};
