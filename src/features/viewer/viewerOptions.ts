import type OpenSeadragon from 'openseadragon';

export const createViewerOptions = (dziUrl: string): OpenSeadragon.Options => ({
  tileSources: dziUrl,
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
});
