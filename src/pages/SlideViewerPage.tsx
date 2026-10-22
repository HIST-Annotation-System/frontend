import { Annotorious, OpenSeadragonAnnotator } from '@annotorious/react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import HotspotBatchNotice from '../features/hotspots/components/HotspotBatchNotice';
import HotspotSelectionOverlay from '../features/hotspots/components/HotspotSelectionOverlay';
import type { HotspotTool } from '../features/hotspots/utils/hotspotBoxes';
import SlideStatusBadge from '../features/slides/components/SlideStatusBadge';
import { useSlide } from '../features/slides/hooks/useSlide';
import { isSlideGone } from '../features/slides/utils/slideConflicts';
import SlideInfoPanel from '../features/viewer/components/SlideInfoPanel';
import SlideViewer from '../features/viewer/components/SlideViewer';
import ViewerHeader from '../features/viewer/components/ViewerHeader';
import { HintSlotContext } from '../features/viewer/hintSlot';
import { StatusSlotContext } from '../features/viewer/statusSlot';
import type { SlideDetail } from '../types/slide';
import { getErrorMessage } from '../utils/errors';
import { formatDimensions } from '../utils/format';
import './SlideViewerPage.css';

export default function SlideViewerPage() {
  const { slideId = '' } = useParams();
  const slideQuery = useSlide(slideId);

  if (slideQuery.isPending) {
    return <Spinner label="Wczytywanie slajdu…" />;
  }
  // The slide is re-checked periodically. A failed re-check keeps the workspace (a network blip must
  // not throw the user out of the viewer); a 404 means someone deleted it - the workspace stays
  // visible underneath but blocked, instead of letting tiles and hotspot requests fail one by one.
  const isDeleted = isSlideGone(slideQuery.error);
  if (!slideQuery.data) {
    const message = isDeleted
      ? 'Ten slajd nie istnieje albo został usunięty.'
      : getErrorMessage(slideQuery.error, 'Nie udało się wczytać slajdu.');
    return (
      <div className="viewer-page__notice">
        <ErrorMessage message={message} />
        <Link to="/">Wróć do biblioteki slajdów</Link>
      </div>
    );
  }

  const slide = slideQuery.data;
  if (slide.status !== 'ready') {
    return (
      <div className="viewer-page__notice">
        <h2 className="viewer-page__notice-title">{slide.name}</h2>
        <SlideStatusBadge status={slide.status} />
        <p className="viewer-page__notice-text">
          {slide.status === 'failed'
            ? (slide.error_message ?? 'Przetwarzanie slajdu nie powiodło się.')
            : 'Slajd nie jest jeszcze gotowy - ta strona odświeży się automatycznie.'}
        </p>
        <Link to="/">Wróć do biblioteki slajdów</Link>
      </div>
    );
  }

  // Keyed by slide: switching slides mounts a fresh viewer.
  return <SlideWorkspace key={slide.id} slide={slide} deleted={isDeleted} />;
}

interface SlideWorkspaceProps {
  slide: SlideDetail;
  /** Deleted by someone else while open here. */
  deleted: boolean;
}

/** The slide viewer is where hotspots are cut out; annotating happens on the hotspots themselves. */
function SlideWorkspace({ slide, deleted }: SlideWorkspaceProps) {
  const [tool, setTool] = useState<HotspotTool | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [statusSlot, setStatusSlot] = useState<HTMLDivElement | null>(null);
  const [hintSlot, setHintSlot] = useState<HTMLElement | null>(null);
  const hint = useMemo(() => ({ slot: hintSlot, setSlot: setHintSlot }), [hintSlot]);

  return (
    // The annotator only owns the OpenSeadragon viewer here: nothing is drawn on the slide.
    <Annotorious>
      <StatusSlotContext.Provider value={statusSlot}>
        <HintSlotContext.Provider value={hint}>
          <div className="viewer-screen">
            <ViewerHeader panel={{ open: panelOpen, onToggle: () => setPanelOpen(!panelOpen) }}>
              <nav className="crumbs" aria-label="Ścieżka">
                <Link to="/">Biblioteka slajdów</Link>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__here" title={slide.name}>
                  {slide.name}
                </span>
              </nav>
              <span className="viewer-header__meta">
                {formatDimensions(slide.width, slide.height)}
              </span>
            </ViewerHeader>
            <div className="viewer-page">
              <div className="viewer-page__main">
                <OpenSeadragonAnnotator drawingEnabled={false}>
                  <SlideViewer slide={slide}>
                    {/* Pędzel / Siatka at the left edge, the marking bar at the bottom while choosing. */}
                    <HotspotSelectionOverlay
                      slide={slide}
                      tool={tool}
                      onToolChange={setTool}
                      onCreated={(batch) => {
                        setTool(null);
                        setBatchId(batch.id);
                      }}
                    />
                    {batchId && <HotspotBatchNotice key={batchId} batchId={batchId} onDismiss={() => setBatchId(null)} />}
                  </SlideViewer>
                </OpenSeadragonAnnotator>
              </div>
              {panelOpen && <SlideInfoPanel slide={slide} />}
            </div>
            <div ref={setStatusSlot} className="viewer-screen__status" />
            {deleted && (
              <div className="viewer-page__deleted" role="alertdialog" aria-labelledby="viewer-page-deleted-title">
                <div className="viewer-page__deleted-box">
                  <h2 id="viewer-page-deleted-title">Slajd został usunięty</h2>
                  <p>
                    Inny administrator usunął slajd „{slide.name}”. Utworzone z niego hotspoty pozostają w katalogu, ale
                    dalsza praca na slajdzie nie jest możliwa.
                  </p>
                  <Link className="btn btn--primary" to="/">
                    Wróć do biblioteki slajdów
                  </Link>
                </div>
              </div>
            )}
          </div>
        </HintSlotContext.Provider>
      </StatusSlotContext.Provider>
    </Annotorious>
  );
}
