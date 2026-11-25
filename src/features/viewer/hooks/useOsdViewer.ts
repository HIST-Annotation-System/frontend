import { useViewer } from '@annotorious/react';
import type OpenSeadragon from 'openseadragon';

/** The OpenSeadragon viewer; undefined until `<OpenSeadragonViewer>` has created it (the library typing omits this). */
export function useOsdViewer(): OpenSeadragon.Viewer | undefined {
  const viewer: OpenSeadragon.Viewer | undefined = useViewer();
  return viewer;
}
