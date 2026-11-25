import type OpenSeadragon from 'openseadragon';

/** Viewer options for a Deep Zoom descriptor URL, or another tile source (e.g. a single image). */
export const createViewerOptions = (
  tileSources: OpenSeadragon.Options['tileSources'],
  overrides: OpenSeadragon.Options = {},
): OpenSeadragon.Options => ({
  tileSources,
  // Tiles need the session cookie, and OpenSeadragon 6's WebGL drawer needs CORS-enabled images.
  crossOriginPolicy: 'use-credentials',
  // The Deep Zoom descriptor (.dzi) is fetched with XHR, which sends the cookie only when asked to.
  ajaxWithCredentials: true,
  // A slide left idle for a while may be removed from the server's disk; its tiles answer 503 while it is copied back
  // (or while the API restarts), so failed tiles are retried for two minutes instead of staying blank.
  tileRetryMax: 24,
  tileRetryDelay: 5000,
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
