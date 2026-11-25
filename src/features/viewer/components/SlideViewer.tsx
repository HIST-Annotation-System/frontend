import { OpenSeadragonViewer } from '@annotorious/react';
import { useMemo, type ReactNode } from 'react';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Spinner from '../../../components/ui/Spinner';
import { getDziUrl } from '../../../services/slidesApi';
import type { SlideDetail } from '../../../types/slide';
import { getErrorMessage } from '../../../utils/errors';
import { getNativeMagnification } from '../../../utils/magnification';
import { useMiddleButtonPan } from '../hooks/useMiddleButtonPan';
import { useSlideImage } from '../hooks/useSlideImage';
import { useTissueFocus } from '../hooks/useTissueFocus';
import { createViewerOptions } from '../viewerOptions';
import ViewerStatusBar from './ViewerStatusBar';
import ViewerStatusBarHost from './ViewerStatusBarHost';
import './SlideViewer.css';

const WAIT_LABELS = {
  loading: 'Wczytywanie slajdu…',
  copying: 'Serwer kopiuje slajd na swój dysk. Przy pierwszym otwarciu dużego slajdu może to potrwać kilka minut…',
  server: 'Serwer chwilowo niedostępny – ponawiam…',
};

interface SlideViewerProps {
  slide: SlideDetail;
  /** Extra overlays rendered on top of the viewer canvas (e.g. the hotspot tools). */
  children?: ReactNode;
}

/**
 * Deep Zoom viewer for one slide, with a status bar below it; the page adds its tools as children. Must be
 * rendered inside `<OpenSeadragonAnnotator>`, which owns the OpenSeadragon viewer instance.
 */
export default function SlideViewer({ slide, children }: SlideViewerProps) {
  const options = useMemo(() => createViewerOptions(getDziUrl(slide.id)), [slide.id]);
  // Fits the tissue into view when the slide opens; zooming is the wheel (the status bar shows the level).
  useTissueFocus(slide);
  useMiddleButtonPan();
  const nativeMagnification = getNativeMagnification(slide);
  const image = useSlideImage(slide.id);

  return (
    <div className="slide-viewer">
      <div className="slide-viewer__frame">
        {image.isSuccess ? (
          <>
            <OpenSeadragonViewer className="slide-viewer__canvas" options={options} />
            {children}
          </>
        ) : (
          <div className="slide-viewer__state">
            <div className="slide-viewer__state-message">
              {image.isError ? (
                <ErrorMessage message={getErrorMessage(image.error, 'Nie udało się otworzyć slajdu.')} />
              ) : (
                <Spinner label={WAIT_LABELS[image.waiting ?? 'loading']} />
              )}
            </div>
          </div>
        )}
      </div>
      <ViewerStatusBarHost>
        <ViewerStatusBar slide={slide} nativeMagnification={nativeMagnification} />
      </ViewerStatusBarHost>
    </div>
  );
}
