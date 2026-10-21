import { Annotorious, OpenSeadragonAnnotator } from '@annotorious/react';
import { Brush, Grid3x3, MousePointer2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import HeaderSlot from '../components/layout/HeaderSlot';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import ToolColumn, { ToolButton } from '../components/ui/ToolColumn';
import HotspotBatchNotice from '../features/hotspots/components/HotspotBatchNotice';
import HotspotSelectionOverlay from '../features/hotspots/components/HotspotSelectionOverlay';
import type { HotspotTool } from '../features/hotspots/utils/hotspotBoxes';
import { useSlide } from '../features/slides/hooks/useSlide';
import { isSlideGone } from '../features/slides/utils/slideConflicts';
import SlideInfo from '../features/viewer/components/SlideInfo';
import SlideViewer from '../features/viewer/components/SlideViewer';
import type { SlideDetail } from '../types/slide';
import { getErrorMessage } from '../utils/errors';
import { isTextField } from '../utils/keyboard';
import './SlideViewerPage.css';

const SLIDE_STATUS_TEXT: Record<SlideDetail['status'], string> = {
  uploading: 'wgrywanie',
  processing: 'przetwarzanie',
  ready: 'gotowy',
  failed: 'błąd',
};

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
        <Link to="/">Wróć do listy slajdów</Link>
      </div>
    );
  }

  const slide = slideQuery.data;
  if (slide.status !== 'ready') {
    return (
      <div className="viewer-page__notice">
        <h2>{slide.name}</h2>
        <p className={slide.status === 'failed' ? 'text-error' : 'text-muted'}>Stan: {SLIDE_STATUS_TEXT[slide.status]}</p>
        <p>
          {slide.status === 'failed'
            ? (slide.error_message ?? 'Przetwarzanie slajdu nie powiodło się.')
            : 'Slajd nie jest jeszcze gotowy. Ta strona odświeży się automatycznie.'}
        </p>
        <Link to="/">Wróć do listy slajdów</Link>
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

const TOOL_KEYS: Record<string, HotspotTool | null> = { v: null, g: 'grid', b: 'brush' };

/** The slide viewer is where hotspots are cut out; annotating happens on the hotspots themselves. */
function SlideWorkspace({ slide, deleted }: SlideWorkspaceProps) {
  const [tool, setTool] = useState<HotspotTool | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [hintSlot, setHintSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!(key in TOOL_KEYS) || event.ctrlKey || event.metaKey || event.altKey || isTextField(event.target)) return;
      setTool(TOOL_KEYS[key]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    // The annotator only owns the OpenSeadragon viewer here: nothing is drawn on the slide.
    <Annotorious>
      <HeaderSlot>
        <nav className="crumbs" aria-label="Ścieżka">
          <Link to="/">Slajdy</Link>
          <span className="crumbs__sep">/</span>
          <span className="crumbs__here" title={slide.original_filename}>
            {slide.name}
          </span>
        </nav>
        <span className="page-strip__spacer" />
        <button type="button" className="app-header__button" onClick={() => setInspectorOpen(!inspectorOpen)}>
          {inspectorOpen ? 'Ukryj panel' : 'Pokaż panel'}
        </button>
      </HeaderSlot>
      <div className="viewer-page">
        <OpenSeadragonAnnotator drawingEnabled={false}>
          <SlideViewer
            slide={slide}
            inspectorOpen={inspectorOpen}
            hint={<span className="viewer-status__slot" ref={setHintSlot} />}
            tools={
              <ToolColumn label="Narzędzia">
                <ToolButton
                  icon={<MousePointer2 size={16} />}
                  label="Nawigacja"
                  shortcut="V"
                  active={tool === null}
                  onClick={() => setTool(null)}
                />
                <ToolButton
                  icon={<Grid3x3 size={16} />}
                  label="Siatka: przeciągnij, aby zaznaczyć pola 1024 × 1024 px równo z poprzednimi"
                  shortcut="G"
                  active={tool === 'grid'}
                  onClick={() => setTool('grid')}
                />
                <ToolButton
                  icon={<Brush size={16} />}
                  label="Pędzel: maluj, aby swobodnie stawiać pola 1024 × 1024 px"
                  shortcut="B"
                  active={tool === 'brush'}
                  onClick={() => setTool('brush')}
                />
              </ToolColumn>
            }
            inspector={
              <>
                <SidebarSection title="Zaznaczenie">
                  {batchId && <HotspotBatchNotice key={batchId} batchId={batchId} onDismiss={() => setBatchId(null)} />}
                  <div className="viewer-page__panel" ref={setPanel} />
                </SidebarSection>
                <SidebarSection title="Parametry slajdu" collapsible defaultOpen={false}>
                  <SlideInfo slide={slide} />
                </SidebarSection>
              </>
            }
          >
            <HotspotSelectionOverlay
              slide={slide}
              tool={tool}
              onToolChange={setTool}
              panelTarget={panel}
              hintTarget={hintSlot}
              onCreated={(batch) => {
                setTool(null);
                setBatchId(batch.id);
              }}
            />
          </SlideViewer>
        </OpenSeadragonAnnotator>
        {deleted && (
          <div className="viewer-page__deleted" role="alertdialog" aria-labelledby="viewer-page-deleted-title">
            <div className="viewer-page__deleted-box">
              <h2 id="viewer-page-deleted-title">Slajd został usunięty</h2>
              <p>
                Inny administrator usunął slajd „{slide.name}”. Utworzone z niego hotspoty pozostają w katalogu, ale
                dalsza praca na slajdzie nie jest możliwa.
              </p>
              <Link to="/">Wróć do listy slajdów</Link>
            </div>
          </div>
        )}
      </div>
    </Annotorious>
  );
}
