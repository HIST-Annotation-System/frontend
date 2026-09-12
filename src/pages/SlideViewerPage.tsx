import { Annotorious } from '@annotorious/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import ClassPalette from '../features/annotations/components/ClassPalette';
import ExportAnnotationsButton from '../features/annotations/components/ExportAnnotationsButton';
import { useAnnotationClasses } from '../features/annotations/hooks/useAnnotationClasses';
import { useAnnotationTool } from '../features/annotations/hooks/useAnnotationTool';
import SlideStatusBadge from '../features/slides/components/SlideStatusBadge';
import { useSlide } from '../features/slides/hooks/useSlide';
import SlideInfoPanel from '../features/viewer/components/SlideInfoPanel';
import SlideViewer from '../features/viewer/components/SlideViewer';
import type { AnnotationClass } from '../types/annotation';
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

  return (
    <Annotorious>
      <div className="viewer-page">
        <aside className="viewer-page__sidebar">
          <SidebarSection title="Klasyfikacja tkanki">
            <ClassPalette classes={classes} activeClassId={tool.activeClassId} onSelect={tool.selectClass} />
          </SidebarSection>
          <SidebarSection title="Anotacje" actions={<ExportAnnotationsButton slide={slide} onError={setError} />} grow>
            <AnnotationList slideId={slide.id} classes={classes} onError={setError} />
          </SidebarSection>
          <SidebarSection title="Informacje o slajdzie">
            <SlideInfoPanel slide={slide} />
          </SidebarSection>
        </aside>

        <div className="viewer-page__main">
          <AnnotationLayer
            slide={slide}
            classes={classes}
            mode={tool.mode}
            activeClassId={tool.activeClassId}
            onError={setError}
          >
            <SlideViewer slide={slide} onError={setError}>
              <AnnotationToolbar mode={tool.mode} onModeChange={tool.setMode} />
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
