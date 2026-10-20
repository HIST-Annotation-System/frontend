import { Annotorious } from '@annotorious/react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import CellTypeSelector from '../features/annotations/components/CellTypeSelector';
import { useCellTypes, useCellTypeTool } from '../features/annotations/hooks/useCellTypes';
import { useAnnotations } from '../features/annotations/hooks/useAnnotations';
import HotspotInfoPanel from '../features/hotspots/components/HotspotInfoPanel';
import HotspotQueueNav from '../features/hotspots/components/HotspotQueueNav';
import HotspotTagPanel from '../features/hotspots/components/HotspotTagPanel';
import HotspotViewer from '../features/hotspots/components/HotspotViewer';
import { useHotspot, useHotspotFolders } from '../features/hotspots/hooks/useHotspots';
import {
  catalogDefaults,
  HOTSPOT_MODES,
  readCatalogParams,
  resolveFolderId,
  writeCatalogParams,
} from '../features/hotspots/utils/hotspotReview';
import type { AnnotationClass, AnnotationOwner, ToolMode } from '../types/annotation';
import type { CellType } from '../types/cellType';
import type { Hotspot } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './SlideViewerPage.css';

/** Annotations live in hotspot image pixels, so the viewer and API coordinates coincide. */
const NO_OFFSET = { x: 0, y: 0 };

export default function HotspotViewerPage() {
  const { hotspotId = '' } = useParams();
  const [searchParams] = useSearchParams();
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

  // Keyed by hotspot and mode: switching either mounts a fresh viewer and annotator (the mode decides whether
  // annotations can be edited).
  return (
    <HotspotWorkspace
      key={`${hotspotQuery.data.id}:${readCatalogParams(searchParams).mode}`}
      hotspot={hotspotQuery.data}
      cellTypes={cellTypesQuery.data}
    />
  );
}

interface HotspotWorkspaceProps {
  hotspot: Hotspot;
  cellTypes: CellType[];
}

/**
 * One hotspot, opened from the catalog: the catalog's mode and filters come along in the URL, so the viewer walks
 * the same list. Assessing only tags (annotations are read-only); browsing and reannotating also annotate.
 */
function HotspotWorkspace({ hotspot, cellTypes }: HotspotWorkspaceProps) {
  const [searchParams] = useSearchParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const catalog = readCatalogParams(searchParams);
  const assessing = catalog.mode === 'assess';
  const [error, setError] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('polygon');
  const mode = assessing ? 'navigate' : toolMode;
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
          <SidebarSection compact>
            <HotspotQueueNav
              hotspot={hotspot}
              query={{
                // Browsing without a folder in the URL lists the first folder: the one this hotspot was opened from.
                folderId: resolveFolderId(catalog, hotspot.folder_id),
                sort: catalog.sort,
                order: catalog.order,
                status: catalog.status,
                tagIds: catalog.tagIds,
              }}
              search={search}
            />
          </SidebarSection>
          {!assessing && (
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
          )}
          <SidebarSection title="Anotacje" grow compact>
            <AnnotationList owner={owner} classes={classes} readOnly={assessing} onError={setError} />
          </SidebarSection>
          {/* Assessing is the expert's job, so the panel starts unrolled there only. */}
          <SidebarSection title="Ocena eksperta" collapsible defaultOpen={assessing}>
            <HotspotTagPanel
              hotspot={hotspot}
              mode={catalog.mode}
              onReannotate={() =>
                navigate({
                  pathname: `/hotspots/${hotspot.id}`,
                  search: new URLSearchParams(
                    writeCatalogParams({ ...catalogDefaults('reannotate'), folder: catalog.folder }),
                  ).toString(),
                })
              }
            />
          </SidebarSection>
        </aside>

        <div className="viewer-page__main">
          <AnnotationLayer
            owner={owner}
            imageOffset={NO_OFFSET}
            classes={classes}
            mode={mode}
            activeClassId={activeClassId}
            readOnly={assessing}
            onError={setError}
          >
            <HotspotViewer
              hotspot={hotspot}
              modeLabel={HOTSPOT_MODES.find((option) => option.value === catalog.mode)?.label}
            >
              {!assessing && (
                <AnnotationToolbar mode={toolMode} onModeChange={setToolMode} canDraw={activeClassId !== null} />
              )}
              <HotspotInfoPanel
                hotspot={hotspot}
                folderName={folders?.find((folder) => folder.id === hotspot.folder_id)?.name}
                onError={setError}
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
