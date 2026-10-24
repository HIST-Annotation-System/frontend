import { Annotorious } from '@annotorious/react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationStatus from '../features/annotations/components/AnnotationStatus';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import CellTypeSelector from '../features/annotations/components/CellTypeSelector';
import SelectedAnnotationCard from '../features/annotations/components/SelectedAnnotationCard';
import { useCellTypes, useCellTypeTool } from '../features/annotations/hooks/useCellTypes';
import { useAnnotations } from '../features/annotations/hooks/useAnnotations';
import { FALLBACK_CELL_TYPE_COLOR } from '../features/annotations/utils/cellTypeColors';
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
import ViewerHeader from '../features/viewer/components/ViewerHeader';
import { HintSlotContext } from '../features/viewer/hintSlot';
import { StatusSlotContext } from '../features/viewer/statusSlot';
import type { AnnotationClass, AnnotationOwner, ToolMode } from '../types/annotation';
import type { CellType } from '../types/cellType';
import type { Hotspot } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './SlideViewerPage.css';

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

  const { data: annotations } = useAnnotations(owner);
  const { activeCellTypeId, colorMap, selectCellType } = useCellTypeTool(cellTypes, annotations);

  const classes: AnnotationClass[] = cellTypes.map((ct) => ({
    id: String(ct.id),
    name: ct.name,
    color: colorMap.get(ct.id) ?? FALLBACK_CELL_TYPE_COLOR,
  }));

  const activeClassId = activeCellTypeId !== null ? String(activeCellTypeId) : null;
  const [panelOpen, setPanelOpen] = useState(true);
  const [statusSlot, setStatusSlot] = useState<HTMLDivElement | null>(null);
  const [hintSlot, setHintSlot] = useState<HTMLElement | null>(null);
  const hint = useMemo(() => ({ slot: hintSlot, setSlot: setHintSlot }), [hintSlot]);
  const modeOption = HOTSPOT_MODES.find((option) => option.value === catalog.mode);
  const folderName = folders?.find((folder) => folder.id === hotspot.folder_id)?.name;

  const counts = new Map<number, number>();
  annotations?.forEach((annotation) => {
    const id = Number(annotation.class_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  const breadcrumbFolder = {
    pathname: '/hotspots',
    search: new URLSearchParams(writeCatalogParams({ ...catalog, folder: hotspot.folder_id })).toString(),
  };
  const errorMessage = error && <ErrorMessage message={error} onDismiss={() => setError(null)} />;

  return (
    <Annotorious>
      <StatusSlotContext.Provider value={statusSlot}>
        <HintSlotContext.Provider value={hint}>
          <div className="viewer-screen">
            <ViewerHeader panel={{ open: panelOpen, onToggle: () => setPanelOpen(!panelOpen) }}>
              <nav className="crumbs" aria-label="Ścieżka">
                <Link to={`/hotspots${search}`}>Hotspoty</Link>
                <span className="crumbs__sep">/</span>
                <Link to={breadcrumbFolder}>{folderName ?? 'Folder'}</Link>
                <span className="crumbs__sep">/</span>
                <span className="crumbs__here" title={hotspot.name}>
                  {hotspot.name}
                </span>
              </nav>
              <HotspotQueueNav
                hotspot={hotspot}
                query={{
                  folderId: resolveFolderId(catalog, hotspot.folder_id),
                  sort: catalog.sort,
                  order: catalog.order,
                  status: catalog.status,
                  tagIds: catalog.tagIds,
                }}
                search={search}
              />
              {modeOption && (
                <span className="viewer-header__mode" title={modeOption.description}>
                  Tryb: {modeOption.label.toLowerCase()}
                </span>
              )}
            </ViewerHeader>
            <div className="viewer-page">
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
                  <HotspotViewer hotspot={hotspot} status={<AnnotationStatus owner={owner} />}>
                    {!assessing && (
                      <AnnotationToolbar mode={toolMode} onModeChange={setToolMode} canDraw={activeClassId !== null} />
                    )}
                    <SelectedAnnotationCard owner={owner} classes={classes} readOnly={assessing} onError={setError} />
                  </HotspotViewer>
                </AnnotationLayer>
                {!panelOpen && errorMessage && <div className="viewer-page__error">{errorMessage}</div>}
              </div>
              {panelOpen && (
                <aside className="side-pane" aria-label="Panel hotspotu">
                  {errorMessage && <div className="viewer-panel__error">{errorMessage}</div>}
                  {!assessing && (
                    <SidebarSection title="Typ komórki">
                      <CellTypeSelector
                        cellTypes={cellTypes}
                        activeCellTypeId={activeCellTypeId}
                        colorMap={colorMap}
                        onSelect={selectCellType}
                        counts={counts}
                      />
                    </SidebarSection>
                  )}
                  <div className="viewer-panel__annotations">
                    <AnnotationList owner={owner} classes={classes} readOnly={assessing} onError={setError} />
                  </div>
                  <SidebarSection title="Ocena eksperta" collapsible defaultOpen={catalog.mode !== 'browse'}>
                    {hotspot.reannotated_at && catalog.mode !== 'reannotate' && (
                      <p className="viewer-panel__corrected">Poprawione</p>
                    )}
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
                  <SidebarSection title="Parametry" collapsible defaultOpen={false}>
                    <HotspotInfoPanel hotspot={hotspot} folderName={folderName} onError={setError} />
                  </SidebarSection>
                </aside>
              )}
            </div>
            <div ref={setStatusSlot} className="viewer-screen__status" />
          </div>
        </HintSlotContext.Provider>
      </StatusSlotContext.Provider>
    </Annotorious>
  );
}
