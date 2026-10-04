import { Annotorious } from '@annotorious/react';
import { Crop } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import Button from '../components/ui/Button';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import ClassPalette from '../features/annotations/components/ClassPalette';
import ExportAnnotationsButton from '../features/annotations/components/ExportAnnotationsButton';
import { useAnnotationClasses } from '../features/annotations/hooks/useAnnotationClasses';
import { useAnnotationTool } from '../features/annotations/hooks/useAnnotationTool';
import HotspotCaptureOverlay from '../features/hotspots/components/HotspotCaptureOverlay';
import HotspotSavedNotice from '../features/hotspots/components/HotspotSavedNotice';
import SlideStatusBadge from '../features/slides/components/SlideStatusBadge';
import { useSlide } from '../features/slides/hooks/useSlide';
import SlideInfoPanel from '../features/viewer/components/SlideInfoPanel';
import SlideViewer from '../features/viewer/components/SlideViewer';
import type { AnnotationClass, AnnotationOwner } from '../types/annotation';
import type { Hotspot } from '../types/hotspot';
import type { SlideDetail } from '../types/slide';
import { getErrorMessage } from '../utils/errors';
import './SlideViewerPage.css';

export default function SlideViewerPage() {
  const { slideId = '' } = useParams();
  const slideQuery = useSlide(slideId);
  const classesQuery = useAnnotationClasses();

  if (slideQuery.isPending || classesQuery.isPending) {
    return <Spinner label="Wczytywanie slajdu…" />;
  }
  if (slideQuery.isError || classesQuery.isError) {
    return (
      <div className="viewer-page__notice">
        <ErrorMessage message={getErrorMessage(slideQuery.error ?? classesQuery.error, 'Nie udało się wczytać slajdu.')} />
        <Link to="/">Wróć do biblioteki slajdów</Link>
      </div>
    );
  }

  const slide = slideQuery.data;
  if (slide.status !== 'ready') {
    return (
      <div className="viewer-page__notice">
        <h2>{slide.name}</h2>
        <SlideStatusBadge status={slide.status} />
        <p>
          {slide.status === 'failed'
            ? (slide.error_message ?? 'Przetwarzanie slajdu nie powiodło się.')
            : 'Slajd nie jest jeszcze gotowy - ta strona odświeży się automatycznie.'}
        </p>
        <Link to="/">Wróć do biblioteki slajdów</Link>
      </div>
    );
  }

  // Keyed by slide: switching slides mounts a fresh viewer and annotator.
  return <SlideWorkspace key={slide.id} slide={slide} classes={classesQuery.data} />;
}

interface SlideWorkspaceProps {
  slide: SlideDetail;
  classes: AnnotationClass[];
}

function SlideWorkspace({ slide, classes }: SlideWorkspaceProps) {
  const tool = useAnnotationTool(classes);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [savedHotspot, setSavedHotspot] = useState<Hotspot | null>(null);
  const owner: AnnotationOwner = { type: 'slides', id: slide.id };

  const toggleCapture = () => {
    // Drawing and framing a hotspot both use the mouse on the canvas.
    if (!isCapturing) tool.setMode('navigate');
    setSavedHotspot(null);
    setIsCapturing(!isCapturing);
  };

  return (
    <Annotorious>
      <div className="viewer-page">
        <aside className="viewer-page__sidebar">
          <SidebarSection compact>
            <ClassPalette
              classes={classes}
              activeClassId={tool.activeClassId}
              onSelect={(classId) => {
                // Picking a class starts drawing, which ends hotspot framing.
                setIsCapturing(false);
                tool.selectClass(classId);
              }}
            />
          </SidebarSection>
          <SidebarSection title="Anotacje" actions={<ExportAnnotationsButton owner={owner} name={slide.name} onError={setError} />} grow compact>
            <AnnotationList owner={owner} classes={classes} onError={setError} />
          </SidebarSection>
          <SidebarSection>
            <SlideInfoPanel slide={slide} />
          </SidebarSection>
        </aside>

        <div className="viewer-page__main">
          <AnnotationLayer
            owner={owner}
            imageOffset={slide.image_offset}
            classes={classes}
            mode={tool.mode}
            activeClassId={tool.activeClassId}
            onError={setError}
          >
            <SlideViewer
              slide={slide}
              onError={setError}
              actions={
                <Button
                  icon={<Crop size={16} />}
                  active={isCapturing}
                  title="Zapisz kwadratowy fragment slajdu jako hotspot do anotacji"
                  onClick={toggleCapture}
                >
                  Hotspot
                </Button>
              }
            >
              {isCapturing ? (
                <HotspotCaptureOverlay
                  slide={slide}
                  onClose={() => setIsCapturing(false)}
                  onCreated={(hotspot) => {
                    setIsCapturing(false);
                    setSavedHotspot(hotspot);
                  }}
                />
              ) : (
                <AnnotationToolbar mode={tool.mode} onModeChange={tool.setMode} />
              )}
              {savedHotspot && <HotspotSavedNotice hotspot={savedHotspot} onDismiss={() => setSavedHotspot(null)} />}
            </SlideViewer>
          </AnnotationLayer>
          {error && (
            <div className="viewer-page__error">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            </div>
          )}
        </div>
      </div>
    </Annotorious>
  );
}
