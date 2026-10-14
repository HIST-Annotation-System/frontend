import { Annotorious } from '@annotorious/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import CellTypeSelector from '../features/annotations/components/CellTypeSelector';
import ExportAnnotationsButton from '../features/annotations/components/ExportAnnotationsButton';
import { useCellTypes, useCellTypeTool } from '../features/annotations/hooks/useCellTypes';
import { useAnnotations } from '../features/annotations/hooks/useAnnotations';
import HotspotInfoPanel from '../features/hotspots/components/HotspotInfoPanel';
import HotspotViewer from '../features/hotspots/components/HotspotViewer';
import { useHotspot, useHotspotFolders } from '../features/hotspots/hooks/useHotspots';
import type { AnnotationClass, AnnotationOwner } from '../types/annotation';
import type { CellType } from '../types/cellType';
import type { Hotspot } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './SlideViewerPage.css';

/** Annotations live in hotspot image pixels, so the viewer and API coordinates coincide. */
const NO_OFFSET = { x: 0, y: 0 };

export default function HotspotViewerPage() {
  const { hotspotId = '' } = useParams();
  const hotspotQuery = useHotspot(hotspotId);
  const cellTypesQuery = useCellTypes();

  if (hotspotQuery.isPending || cellTypesQuery.isPending) {
    return <Spinner label="Wczytywanie hotspotu…" />;
  }
  if (hotspotQuery.isError || cellTypesQuery.isError) {
    return (
      <div className="viewer-page__notice">
        <ErrorMessage
          message={getErrorMessage(hotspotQuery.error ?? cellTypesQuery.error, 'Nie udało się wczytać hotspotu.')}
        />
        <Link to="/hotspots">Wróć do katalogu hotspotów</Link>
      </div>
    );
  }

  // Keyed by hotspot: switching hotspots mounts a fresh viewer and annotator.
  return (
    <HotspotWorkspace
      key={hotspotQuery.data.id}
      hotspot={hotspotQuery.data}
      cellTypes={cellTypesQuery.data}
    />
  );
}

interface HotspotWorkspaceProps {
  hotspot: Hotspot;
  cellTypes: CellType[];
}

function HotspotWorkspace({ hotspot, cellTypes }: HotspotWorkspaceProps) {
  const [error, setError] = useState<string | null>(null);
  const { data: folders } = useHotspotFolders();
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };

  // Load annotations so we can seed colors for existing cell types
  const { data: annotations } = useAnnotations(owner);
  const { activeCellTypeId, colorMap, selectCellType } = useCellTypeTool(cellTypes, annotations);

  // Build AnnotationClass list from cell types + color map for compatibility with existing components
  const classes: AnnotationClass[] = cellTypes.map((ct) => ({
    id: String(ct.id),
    name: ct.name,
    color: colorMap.get(ct.id) ?? '#94a3b8',
  }));

  const activeClassId = activeCellTypeId != null ? String(activeCellTypeId) : null;

  const handleSelectCellType = (id: number) => {
    selectCellType(id);
  };

  return (
    <Annotorious>
      <div className="viewer-page">
        <aside className="viewer-page__sidebar">
          <SidebarSection title="Typ komórki" compact>
            <div style={{ padding: '8px' }}>
              <CellTypeSelector
                cellTypes={cellTypes}
                activeCellTypeId={activeCellTypeId}
                colorMap={colorMap}
                onSelect={handleSelectCellType}
              />
            </div>
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
            mode={activeCellTypeId != null ? 'draw' : 'navigate'}
            activeClassId={activeClassId}
            onError={setError}
          >
            <HotspotViewer hotspot={hotspot}>
              <AnnotationToolbar
                mode={activeCellTypeId != null ? 'draw' : 'navigate'}
                onModeChange={() => {}}
              />
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
