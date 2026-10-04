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
import HotspotInfoPanel from '../features/hotspots/components/HotspotInfoPanel';
import HotspotViewer from '../features/hotspots/components/HotspotViewer';
import { useHotspot, useHotspotFolders } from '../features/hotspots/hooks/useHotspots';
import type { AnnotationClass, AnnotationOwner } from '../types/annotation';
import type { Hotspot } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './SlideViewerPage.css';

/** Annotations live in hotspot image pixels, so the viewer and API coordinates coincide. */
const NO_OFFSET = { x: 0, y: 0 };

export default function HotspotViewerPage() {
  const { hotspotId = '' } = useParams();
  const hotspotQuery = useHotspot(hotspotId);
  const classesQuery = useAnnotationClasses();

  if (hotspotQuery.isPending || classesQuery.isPending) {
    return <Spinner label="Wczytywanie hotspotu…" />;
  }
  if (hotspotQuery.isError || classesQuery.isError) {
    return (
      <div className="viewer-page__notice">
        <ErrorMessage
          message={getErrorMessage(hotspotQuery.error ?? classesQuery.error, 'Nie udało się wczytać hotspotu.')}
        />
        <Link to="/hotspots">Wróć do katalogu hotspotów</Link>
      </div>
    );
  }

  // Keyed by hotspot: switching hotspots mounts a fresh viewer and annotator.
  return <HotspotWorkspace key={hotspotQuery.data.id} hotspot={hotspotQuery.data} classes={classesQuery.data} />;
}

interface HotspotWorkspaceProps {
  hotspot: Hotspot;
  classes: AnnotationClass[];
}

function HotspotWorkspace({ hotspot, classes }: HotspotWorkspaceProps) {
  const tool = useAnnotationTool(classes);
  const [error, setError] = useState<string | null>(null);
  const { data: folders } = useHotspotFolders();
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };

  return (
    <Annotorious>
      <div className="viewer-page">
        <aside className="viewer-page__sidebar">
          <SidebarSection compact>
            <ClassPalette classes={classes} activeClassId={tool.activeClassId} onSelect={tool.selectClass} />
          </SidebarSection>
          <SidebarSection
            title="Anotacje"
            actions={<ExportAnnotationsButton owner={owner} name={hotspot.name} onError={setError} />}
            grow
            compact
          >
            <AnnotationList owner={owner} classes={classes} onError={setError} />
          </SidebarSection>
          <SidebarSection title="Hotspot">
            <HotspotInfoPanel
              hotspot={hotspot}
              folderName={folders?.find((folder) => folder.id === hotspot.folder_id)?.name}
            />
          </SidebarSection>
        </aside>

        <div className="viewer-page__main">
          <AnnotationLayer
            owner={owner}
            imageOffset={NO_OFFSET}
            classes={classes}
            mode={tool.mode}
            activeClassId={tool.activeClassId}
            onError={setError}
          >
            <HotspotViewer hotspot={hotspot}>
              <AnnotationToolbar mode={tool.mode} onModeChange={tool.setMode} />
            </HotspotViewer>
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
