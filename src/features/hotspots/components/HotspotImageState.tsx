import type OpenSeadragon from 'openseadragon';
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import { useOsdViewer } from '../../viewer/hooks/useOsdViewer';

interface HotspotImageStateProps {
  hotspotId: string;
  imageUrl: string;
}

type Outcome = 'shown' | 'failed';

/** Once the image has opened it is drawn at once. Past this, the cover goes anyway: it must never hide a working image. */
const OPENED_GRACE_MS = 1500;

/**
 * Covers the viewer until the hotspot's image is on screen. The full image can take many seconds on first opening,
 * and until then the canvas is empty: the thumbnail (usually cached by the catalog) shows what is coming, and a failed
 * load can be retried. It also keeps shapes from being drawn on an image that isn't there yet.
 */
export default function HotspotImageState({ hotspotId, imageUrl }: HotspotImageStateProps) {
  const viewer = useOsdViewer();
  // Tied to its viewer, because a new viewer starts over.
  const [settled, setSettled] = useState<{ viewer: OpenSeadragon.Viewer; outcome: Outcome } | null>(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const outcome = viewer && settled?.viewer === viewer ? settled.outcome : null;

  useEffect(() => {
    if (!viewer) return undefined;
    let item: OpenSeadragon.TiledImage | null = null;
    let grace = 0;
    const show = () => setSettled({ viewer, outcome: 'shown' });
    const showIfLoaded = () => {
      if (item?.getFullyLoaded()) show();
    };
    const handleOpen = () => {
      item?.removeHandler('fully-loaded-change', showIfLoaded);
      window.clearTimeout(grace);
      item = viewer.world.getItemCount() > 0 ? viewer.world.getItemAt(0) : null;
      if (!item) return;
      item.addHandler('fully-loaded-change', showIfLoaded);
      grace = window.setTimeout(show, OPENED_GRACE_MS);
      showIfLoaded();
    };
    const handleFailure = () => setSettled({ viewer, outcome: 'failed' });
    viewer.addHandler('open', handleOpen);
    viewer.addHandler('open-failed', handleFailure);
    // The image may have opened before this effect ran.
    handleOpen();
    return () => {
      viewer.removeHandler('open', handleOpen);
      viewer.removeHandler('open-failed', handleFailure);
      item?.removeHandler('fully-loaded-change', showIfLoaded);
      window.clearTimeout(grace);
    };
  }, [viewer]);

  if (outcome === 'shown') return null;

  return (
    <div className="hotspot-image-state">
      {!thumbnailFailed && (
        <img
          className="hotspot-image-state__thumbnail"
          src={getHotspotThumbnailUrl(hotspotId)}
          alt=""
          onError={() => setThumbnailFailed(true)}
        />
      )}
      <div className="hotspot-image-state__message">
        {outcome === 'failed' ? (
          <>
            <ErrorMessage message="Nie udało się wczytać obrazu hotspotu." />
            <Button
              onClick={() => {
                setSettled(null);
                viewer?.open({ tileSource: { type: 'image', url: imageUrl } });
              }}
            >
              Spróbuj ponownie
            </Button>
          </>
        ) : (
          <Spinner label="Wczytywanie obrazu…" />
        )}
      </div>
    </div>
  );
}
