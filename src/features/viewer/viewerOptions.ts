import type OpenSeadragon from 'openseadragon';

/** Viewer options for a Deep Zoom descriptor URL, or another tile source (e.g. a single image). */
export const createViewerOptions = (
  tileSources: OpenSeadragon.Options['tileSources'],
  overrides: OpenSeadragon.Options = {},
): OpenSeadragon.Options => ({
  tileSources,
  // Tiles come from the API origin; OpenSeadragon 6 picks the WebGL drawer, which needs CORS-enabled images.
  crossOriginPolicy: 'Anonymous',
  // Navigation buttons are custom React controls, so OpenSeadragon's image buttons (prefixUrl) are not needed.
  showNavigationControl: false,
  showNavigator: true,
  navigatorPosition: 'BOTTOM_RIGHT',
  navigatorBackground: '#ffffff',
  navigatorOpacity: 1,
  navigatorBorderColor: '#000000',
  navigatorDisplayRegionColor: '#000000',
  gestureSettingsMouse: { clickToZoom: false },
  maxZoomPixelRatio: 2,
  visibilityRatio: 0.5,
  constrainDuringPan: true,
  animationTime: 0.3,
  blendTime: 0.1,
  ...overrides,
});
