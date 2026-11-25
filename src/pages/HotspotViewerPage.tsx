import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Annotorious } from '@annotorious/react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import BottomSections from '../components/ui/BottomSections';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationStatus from '../features/annotations/components/AnnotationStatus';
import AnnotationFilters from '../features/annotations/components/AnnotationFilters';
import AnnotationProgress from '../features/annotations/components/AnnotationProgress';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import ExcludedAreaHatching from '../features/annotations/components/ExcludedAreaHatching';
import SelectedAnnotationCard from '../features/annotations/components/SelectedAnnotationCard';
import { useCellTypes, useCellTypeTool } from '../features/annotations/hooks/useCellTypes';
import { useAnnotations, useModelCellsRefresh } from '../features/annotations/hooks/useAnnotations';
import {
  authorLayer,
  EXCLUDED_LAYER,
  hiddenParts,
  type ModelFilter,
} from '../features/annotations/utils/annotationLayers';
import { FALLBACK_CELL_TYPE_COLOR } from '../features/annotations/utils/cellTypeColors';
import HotspotInfoPanel from '../features/hotspots/components/HotspotInfoPanel';
import HotspotQueueNav from '../features/hotspots/components/HotspotQueueNav';
import HotspotReannotatedButton from '../features/hotspots/components/HotspotReannotatedButton';
import HotspotTagPanel from '../features/hotspots/components/HotspotTagPanel';
import HotspotTagMarks from '../features/hotspots/components/TagMarks';
import HotspotViewer from '../features/hotspots/components/HotspotViewer';
import ReannotationControls from '../features/reannotation/components/ReannotationControls';
import { useHotspot, useHotspotFolders } from '../features/hotspots/hooks/useHotspots';
import {
  catalogDefaults,
  readCatalogParams,
  catalogQuery,
  resolveFolderId,
  writeCatalogParams,
} from '../features/hotspots/utils/hotspotReview';
import PaneHandle from '../features/viewer/components/PaneHandle';
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
  useDocumentTitle(hotspot.name);
  const [searchParams] = useSearchParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const catalog = readCatalogParams(searchParams);
  const { user } = useAuth();
  const username = user?.username;
  const { layered, my_status: myStatus } = hotspot.reannotation;
  // Only reannotating changes annotations: in layers, once the user has started and until they confirm.
  const readOnly = catalog.mode !== 'reannotate' || (layered && myStatus !== 'draft');
  const [error, setError] = useState<string | null>(null);
  // Every mode starts by looking around (pan and zoom); a drawing tool is picked from the tool panel.
  const [toolMode, setToolMode] = useState<ToolMode>('navigate');
  const [excluding, setExcluding] = useState(false);
  const mode = readOnly ? 'navigate' : toolMode;
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
  // Once the user has a layer of their own, the model's cells they have changed or confirmed are out of the way:
  // only those still waiting for them are drawn, unless they ask for all.
  const hasOwnLayer = layered && myStatus !== null;
  const [modelFilter, setModelFilter] = useState<ModelFilter>('remaining');
  const shownModelFilter = hasOwnLayer ? modelFilter : null;
  const hiddenLayerParts = useMemo(() => hiddenParts(hiddenLayers, shownModelFilter), [hiddenLayers, shownModelFilter]);
  const toggleLayer = useCallback((layer: string) => {
    setHiddenLayers((current) => {
      const next = new Set(current);
      if (!next.delete(layer)) next.add(layer);
      return next;
    });
  }, []);
  // What the user draws lands in their own layer (or the areas'), so that layer is switched on.
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

  // How opaque each layer is drawn; a layer missing here is fully opaque.
  const [layerOpacity, setLayerOpacity] = useState<ReadonlyMap<string, number>>(new Map<string, number>());
  const changeLayerOpacity = useCallback((layer: string, opacity: number) => {
    setLayerOpacity((current) => {
      const next = new Map(current);
      if (opacity >= 1) next.delete(layer);
      else next.set(layer, opacity);
      return next;
    });
  }, []);

  const activeClassId = activeCellTypeId !== null ? String(activeCellTypeId) : null;
  const [panelOpen, setPanelOpen] = useState(true);
  const [statusSlot, setStatusSlot] = useState<HTMLDivElement | null>(null);
  const [hintSlot, setHintSlot] = useState<HTMLElement | null>(null);
  const hint = useMemo(() => ({ slot: hintSlot, setSlot: setHintSlot }), [hintSlot]);
  const folderName = folders?.find((folder) => folder.id === hotspot.folder_id)?.name;

  const breadcrumbFolder = {
    pathname: '/hotspots',
    search: new URLSearchParams(writeCatalogParams({ ...catalog, folder: hotspot.folder_id })).toString(),
  };
  const errorMessage = error && <ErrorMessage message={error} onDismiss={() => setError(null)} />;

  return (
    <Annotorious>
      <StatusSlotContext.Provider value={statusSlot}>
        <HintSlotContext.Provider value={hint}>
          <div className={`viewer-screen${panelOpen ? ' viewer-screen--panel-open' : ''}`}>
            <div className="viewer-page">
              <div className="viewer-page__main">
                <ViewerHeader>
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
                    query={catalogQuery(catalog, resolveFolderId(catalog, hotspot.folder_id))}
                    search={search}
                  />
                  {/* Reannotating fixes what the expert found, so the verdict stays in sight. */}
                  {catalog.mode === 'reannotate' && hotspot.tags.length > 0 && (
                    <span className="viewer-header__verdict">
                      <HotspotTagMarks tags={hotspot.tags} labelled strong />
                    </span>
                  )}
                </ViewerHeader>
                <AnnotationLayer
                  owner={owner}
                  imageOffset={NO_OFFSET}
                  classes={classes}
                  mode={mode}
                  activeClassId={activeClassId}
                  activeKind={excluding ? 'excluded' : 'cell'}
                  readOnly={readOnly}
                  hiddenClassIds={hiddenClassIds}
                  hiddenLayers={hiddenLayerParts}
                  layerOpacity={layerOpacity}
                  editableBy={layered ? username : undefined}
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
                    {!readOnly && (
                      <AnnotationToolbar
                        mode={toolMode}
                        onModeChange={setToolMode}
                        excluding={excluding}
                        onExcludingChange={setExcluding}
                      />
                    )}
                    <SelectedAnnotationCard
                      owner={owner}
                      classes={classes}
                      readOnly={readOnly}
                      editableBy={layered ? username : undefined}
                      onTypeChosen={(classId) => {
                        selectCellType(Number(classId));
                        showClass(classId);
                      }}
                      onError={setError}
                    />
                  </HotspotViewer>
                </AnnotationLayer>
                {!panelOpen && errorMessage && <div className="viewer-page__error">{errorMessage}</div>}
              </div>
              <PaneHandle open={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} />
              {panelOpen && (
                <aside className="side-pane" aria-label="Panel hotspotu">
                  {errorMessage && <div className="viewer-panel__error">{errorMessage}</div>}
                  <div className="viewer-panel__annotations">
                    <AnnotationFilters
                      owner={owner}
                      classes={classes}
                      hiddenClassIds={hiddenClassIds}
                      onToggleClass={toggleClass}
                      onShowAllClasses={showAllClasses}
                      hiddenLayers={hiddenLayers}
                      onToggleLayer={toggleLayer}
                      layerOpacity={layerOpacity}
                      onLayerOpacity={changeLayerOpacity}
                      modelFilter={shownModelFilter}
                      onModelFilter={setModelFilter}
                    />
                  </div>
                  <div className="viewer-panel__dock">
                    <BottomSections
                      sections={[
                        {
                          title: 'Ocena eksperta',
                          defaultOpen: true,
                          content: (
                            <>
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
                            </>
                          ),
                        },
                        {
                          title: 'Parametry',
                          content: <HotspotInfoPanel hotspot={hotspot} folderName={folderName} onError={setError} />,
                        },
                      ]}
                    />
                  </div>
                  {/* The step that ends a reannotation: pinned to the bottom of the panel, below everything else. */}
                  {catalog.mode === 'reannotate' && (
                    <div className="viewer-panel__footer">
                      {layered ? <ReannotationControls hotspot={hotspot} /> : <HotspotReannotatedButton hotspot={hotspot} />}
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
