import type { Slide } from '../types/slide';

/** Standard microscope objective steps offered as quick zoom presets. */
export const MAGNIFICATION_PRESETS = [1, 2, 5, 10, 20, 40] as const;

/** ~10 µm/px corresponds to 1x, so 0.5 µm/px ≈ 20x and 0.25 µm/px ≈ 40x. */
const MICRONS_PER_PIXEL_AT_1X = 10;

/**
 * Magnification of the slide's level 0 (full resolution): the scanner's objective power, or an
 * estimate from the pixel size; null for plain images without either.
 */
export const getNativeMagnification = (slide: Pick<Slide, 'objective_power' | 'mpp_x'>): number | null => {
  if (slide.objective_power && slide.objective_power > 0) return slide.objective_power;
  if (slide.mpp_x && slide.mpp_x > 0) return Math.round(MICRONS_PER_PIXEL_AT_1X / slide.mpp_x);
  return null;
};

export const availablePresets = (nativeMagnification: number | null): number[] =>
  nativeMagnification ? MAGNIFICATION_PRESETS.filter((preset) => preset <= nativeMagnification) : [];

/** `imageZoom` is screen pixels per level-0 pixel (1 = full resolution). */
export const imageZoomToMagnification = (imageZoom: number, nativeMagnification: number): number =>
  imageZoom * nativeMagnification;

export const magnificationToImageZoom = (magnification: number, nativeMagnification: number): number =>
  magnification / nativeMagnification;

export const formatMagnification = (magnification: number): string =>
  `${magnification >= 10 ? magnification.toFixed(0) : magnification.toFixed(1)}×`;

export const formatZoomPercent = (imageZoom: number): string => {
  const percent = imageZoom * 100;
  return `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;
};
