import type OpenSeadragon from 'openseadragon';
import { NAVIGATOR_ID } from './components/ViewerNavigator';

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
  // The minimap lives in the inspector's "Nawigator" panel (see ViewerNavigator), not over the image.
  showNavigator: true,
  navigatorId: NAVIGATOR_ID,
  navigatorBackground: '#1e1e1e',
  navigatorOpacity: 1,
  navigatorBorderColor: '#1e1e1e',
  navigatorDisplayRegionColor: '#ffffff',
  gestureSettingsMouse: { clickToZoom: false },
  maxZoomPixelRatio: 2,
  visibilityRatio: 0.5,
  constrainDuringPan: true,
  animationTime: 0.3,
  blendTime: 0.1,
  ...overrides,
});
