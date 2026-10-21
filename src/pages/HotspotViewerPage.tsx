import { Annotorious } from '@annotorious/react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LayoutGrid,
  PanelRightClose,
  PanelRightOpen,
  PencilLine,
  Star,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import AnnotationLayer from '../features/annotations/components/AnnotationLayer';
import AnnotationStatus from '../features/annotations/components/AnnotationStatus';
import AnnotationList from '../features/annotations/components/AnnotationList';
import AnnotationToolbar from '../features/annotations/components/AnnotationToolbar';
import CellTypeSelector from '../features/annotations/components/CellTypeSelector';
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
  type HotspotMode,
  readCatalogParams,
  resolveFolderId,
  writeCatalogParams,
} from '../features/hotspots/utils/hotspotReview';
import ViewerHeader from '../features/viewer/components/ViewerHeader';
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
        <div className="viewer-page__notice-card">
          <ErrorMessage
            message={getErrorMessage(hotspotQuery.error ?? cellTypesQuery.error, 'Nie udało się wczytać hotspotu.')}
          />
          <Link className="btn btn--primary" to="/hotspots">
            <ArrowLeft size={16} />
            Wróć do katalogu hotspotów
          </Link>
        </div>
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
    color: colorMap.get(ct.id) ?? FALLBACK_CELL_TYPE_COLOR,
  }));

  const activeClassId = activeCellTypeId != null ? String(activeCellTypeId) : null;
  const activeClass = classes.find((item) => item.id === activeClassId) ?? null;
  const [panelOpen, setPanelOpen] = useState(true);
  const modeOption = HOTSPOT_MODES.find((option) => option.value === catalog.mode);
  const folderName = folders?.find((folder) => folder.id === hotspot.folder_id)?.name;

  // Outlines per cell type, for the type list.
  const counts = new Map<number, number>();
  annotations?.forEach((annotation) => {
    const id = Number(annotation.class_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  const handleSelectCellType = (id: number) => {
    selectCellType(id);
  };

  const verdict = (
    <section className="viewer-panel__section">
      {(!assessing || hotspot.reannotated_at) && (
        <div className="viewer-panel__section-head">
          {!assessing && <span className="label-caps">Ocena eksperta</span>}
          {hotspot.reannotated_at && <CorrectedChip />}
        </div>
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
    </section>
  );

  return (
    <Annotorious>
      <div className="viewer-screen">
        <ViewerHeader backTo={`/hotspots${search}`} backLabel="Hotspoty">
          {folderName && (
            <Link
              className="viewer-header__crumb viewer-header__crumb--link"
              to={{
                pathname: '/hotspots',
                search: new URLSearchParams(writeCatalogParams({ ...catalog, folder: hotspot.folder_id })).toString(),
              }}
              title={`Wróć do folderu ${folderName}`}
            >
              {folderName}
            </Link>
          )}
          {folderName && <ChevronRight size={14} className="viewer-header__crumb-sep" aria-hidden="true" />}
          <span className="viewer-header__name" title={hotspot.name}>
            {hotspot.name}
          </span>
          {hotspot.reannotated_at && <CorrectedChip />}
          {modeOption && (
            <span className="viewer-header__chip" title={modeOption.description}>
              {MODE_ICONS[modeOption.value]}
              {modeOption.label}
            </span>
          )}
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
                  <AnnotationToolbar
                    mode={toolMode}
                    onModeChange={setToolMode}
                    canDraw={activeClassId !== null}
                    activeClass={activeClass}
                  />
                )}
              </HotspotViewer>
            </AnnotationLayer>
            {error && (
              <div className="viewer-page__error">
                <ErrorMessage message={error} onDismiss={() => setError(null)} />
              </div>
            )}
          </div>
          {panelOpen ? (
            <aside className="viewer-panel viewer-panel--wide" aria-label="Panel hotspotu">
              <div className="viewer-panel__head">
                <span className="label-caps">{assessing ? 'Ocena eksperta' : 'Typ komórki'}</span>
                <button
                  type="button"
                  className="viewer-panel__icon-btn"
                  title="Zwiń panel"
                  aria-label="Zwiń panel"
                  onClick={() => setPanelOpen(false)}
                >
                  <PanelRightClose size={16} />
                </button>
              </div>
              {/* Assessing is the expert's job, so the verdict comes first there. */}
              {assessing && verdict}
              {!assessing && (
                <div className="viewer-panel__types">
                  <CellTypeSelector
                    cellTypes={cellTypes}
                    activeCellTypeId={activeCellTypeId}
                    colorMap={colorMap}
                    onSelect={handleSelectCellType}
                    counts={counts}
                  />
                </div>
              )}
              <div className="viewer-panel__annotations">
                <AnnotationList owner={owner} classes={classes} readOnly={assessing} onError={setError} />
              </div>
              {!assessing && verdict}
              <HotspotInfoPanel hotspot={hotspot} folderName={folderName} onError={setError} />
            </aside>
          ) : (
            <aside className="viewer-panel viewer-panel--wide viewer-panel--collapsed" aria-label="Panel hotspotu">
              <button
                type="button"
                className="viewer-panel__icon-btn"
                title="Pokaż panel"
                aria-label="Pokaż panel"
                onClick={() => setPanelOpen(true)}
              >
                <PanelRightOpen size={16} />
              </button>
              {activeClass && !assessing && (
                <span
                  className="viewer-panel__rail-swatch"
                  style={{ background: activeClass.color }}
                  title={activeClass.name}
                />
              )}
              <span className="viewer-panel__rail-count" title="Obrysy">
                {annotations?.length ?? ''}
              </span>
            </aside>
          )}
        </div>
      </div>
    </Annotorious>
  );
}

const MODE_ICONS: Record<HotspotMode, ReactNode> = {
  browse: <LayoutGrid size={13} aria-hidden="true" />,
  assess: <Star size={13} aria-hidden="true" />,
  reannotate: <PencilLine size={13} aria-hidden="true" />,
};

function CorrectedChip() {
  return (
    <span className="viewer-header__chip viewer-header__chip--sm">
      <Check size={12} aria-hidden="true" />
      Poprawione
    </span>
  );
}
