import { Annotorious } from '@annotorious/react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationStatus from '../features/annotations/components/AnnotationStatus';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationProgress from '../features/annotations/components/AnnotationProgress';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import ExcludedAreaHatching from '../features/annotations/components/ExcludedAreaHatching';
import CellTypeSelector from '../features/annotations/components/CellTypeSelector';
import SelectedAnnotationCard from '../features/annotations/components/SelectedAnnotationCard';
import { useCellTypes, useCellTypeTool } from '../features/annotations/hooks/useCellTypes';
import { useAnnotations, useModelCellsRefresh } from '../features/annotations/hooks/useAnnotations';
import { authorLayer, EXCLUDED_LAYER } from '../features/annotations/utils/annotationLayers';
import { FALLBACK_CELL_TYPE_COLOR } from '../features/annotations/utils/cellTypeColors';
import HotspotModeSwitch from '../features/hotspots/components/HotspotModeSwitch';
import HotspotInfoPanel from '../features/hotspots/components/HotspotInfoPanel';
import HotspotQueueNav from '../features/hotspots/components/HotspotQueueNav';
import HotspotReannotatedButton from '../features/hotspots/components/HotspotReannotatedButton';
import HotspotTagPanel from '../features/hotspots/components/HotspotTagPanel';
import HotspotTagMarks from '../features/hotspots/components/TagMarks';
import HotspotViewer from '../features/hotspots/components/HotspotViewer';
import { useHotspot, useHotspotFolders } from '../features/hotspots/hooks/useHotspots';
import {
  catalogDefaults,
  readCatalogParams,
  resolveFolderId,
  writeCatalogParams,
} from '../features/hotspots/utils/hotspotReview';
import ViewerHeader from '../features/viewer/components/ViewerHeader';
import { HintSlotContext } from '../features/viewer/hintSlot';
import { StatusSlotContext } from '../features/viewer/statusSlot';
import type { AnnotationClass, AnnotationKind, AnnotationOwner, ToolMode } from '../types/annotation';
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
  // Every mode starts by looking around (pan and zoom); a drawing tool is picked from the tool panel.
  const [toolMode, setToolMode] = useState<ToolMode>('navigate');
  const [excluding, setExcluding] = useState(false);
  const mode = assessing ? 'navigate' : toolMode;
  const { data: folders } = useHotspotFolders();
  const owner: AnnotationOwner = { type: 'hotspots', id: hotspot.id };

  const { data: annotations } = useAnnotations(owner);
  const loadingModelCells = useModelCellsRefresh(owner, hotspot.segmentation_status);
  const { activeCellTypeId, colorMap, selectCellType } = useCellTypeTool(cellTypes, annotations);

  // Memoized: a new array here would restyle every shape on the image, on every change to any annotation.
  const classes: AnnotationClass[] = useMemo(
    () =>
      cellTypes.map((ct) => ({
        id: String(ct.id),
        name: ct.name,
        color: colorMap.get(ct.id) ?? FALLBACK_CELL_TYPE_COLOR,
      })),
    [cellTypes, colorMap],
  );

  // Cell types unchecked in the filter. Hidden rather than shown, so a type that appears later is visible.
  const [hiddenClassIds, setHiddenClassIds] = useState<ReadonlySet<string>>(new Set<string>());
  const toggleClass = useCallback((classId: string) => {
    setHiddenClassIds((current) => {
      const next = new Set(current);
      if (!next.delete(classId)) next.add(classId);
      return next;
    });
  }, []);
  const showClass = useCallback((classId: string) => {
    setHiddenClassIds((current) => {
      if (!current.has(classId)) return current;
      const next = new Set(current);
      next.delete(classId);
      return next;
    });
  }, []);
  const showAllClasses = useCallback(() => setHiddenClassIds(new Set<string>()), []);

  // Layers switched off: the model's cells, one author's cells, the excluded areas.
  const [hiddenLayers, setHiddenLayers] = useState<ReadonlySet<string>>(new Set<string>());
  const toggleLayer = useCallback((layer: string) => {
    setHiddenLayers((current) => {
      const next = new Set(current);
      if (!next.delete(layer)) next.add(layer);
      return next;
    });
  }, []);
  // What the user draws lands in their own layer (or the areas'), so that layer is switched on.
  const username = useAuth().user?.username;
  const showDrawnLayer = useCallback(
    (kind: AnnotationKind) => {
      const layer = kind === 'excluded' ? EXCLUDED_LAYER : authorLayer(username);
      setHiddenLayers((current) => {
        if (!current.has(layer)) return current;
        const next = new Set(current);
        next.delete(layer);
        return next;
      });
    },
    [username],
  );

  const activeClassId = activeCellTypeId !== null ? String(activeCellTypeId) : null;
  const [panelOpen, setPanelOpen] = useState(true);
  const [statusSlot, setStatusSlot] = useState<HTMLDivElement | null>(null);
  const [hintSlot, setHintSlot] = useState<HTMLElement | null>(null);
  const hint = useMemo(() => ({ slot: hintSlot, setSlot: setHintSlot }), [hintSlot]);
  const folderName = folders?.find((folder) => folder.id === hotspot.folder_id)?.name;

  const counts = new Map<number, number>();
  annotations?.forEach((annotation) => {
    if (annotation.class_id === null) return;
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
              {/* Switching the mode keeps this hotspot open; the queue (prev/next) follows the new mode. */}
              <div className="viewer-header__mode">
                <HotspotModeSwitch
                  mode={catalog.mode}
                  onChange={(next) =>
                    navigate(
                      {
                        pathname: `/hotspots/${hotspot.id}`,
                        search: new URLSearchParams(
                          writeCatalogParams({ ...catalogDefaults(next), folder: catalog.folder }),
                        ).toString(),
                      },
                      { replace: true },
                    )
                  }
                />
              </div>
              {/* Reannotating fixes what the expert found, so the verdict stays in sight. */}
              {catalog.mode === 'reannotate' && hotspot.tags.length > 0 && (
                <span className="viewer-header__verdict">
                  <HotspotTagMarks tags={hotspot.tags} labelled strong />
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
                  activeKind={excluding ? 'excluded' : 'cell'}
                  readOnly={assessing}
                  hiddenClassIds={hiddenClassIds}
                  hiddenLayers={hiddenLayers}
                  onCellDrawn={showClass}
                  onShapeDrawn={showDrawnLayer}
                  onError={setError}
                >
                  <HotspotViewer hotspot={hotspot} status={<AnnotationStatus owner={owner} />}>
                    <ExcludedAreaHatching hidden={hiddenLayers.has(EXCLUDED_LAYER)} />
                    <AnnotationProgress
                      owner={owner}
                      segmentationStatus={hotspot.segmentation_status}
                      loadingModelCells={loadingModelCells}
                    />
                    {!assessing && (
                      <AnnotationToolbar
                        mode={toolMode}
                        onModeChange={setToolMode}
                        canDraw={activeClassId !== null}
                        excluding={excluding}
                        onExcludingChange={setExcluding}
                      />
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
                        onSelect={(id) => {
                          selectCellType(id);
                          showClass(String(id));
                        }}
                        counts={counts}
                      />
                    </SidebarSection>
                  )}
                  <div className="viewer-panel__annotations">
                    <AnnotationList
                      owner={owner}
                      classes={classes}
                      readOnly={assessing}
                      hiddenClassIds={hiddenClassIds}
                      onToggleClass={toggleClass}
                      onShowAllClasses={showAllClasses}
                      hiddenLayers={hiddenLayers}
                      onToggleLayer={toggleLayer}
                      onError={setError}
                    />
                  </div>
                  <div className="viewer-panel__dock">
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
                  </div>
                  {/* The step that ends a reannotation: pinned to the bottom of the panel, below everything else. */}
                  {catalog.mode === 'reannotate' && (
                    <div className="viewer-panel__footer">
                      <HotspotReannotatedButton hotspot={hotspot} />
                    </div>
                  )}
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
