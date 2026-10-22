import { PanelRightOpen } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import HotspotActivityStrip from '../features/hotspots/components/HotspotActivityStrip';
import HotspotBulkBar from '../features/hotspots/components/HotspotBulkBar';
import HotspotCard from '../features/hotspots/components/HotspotCard';
import HotspotFilters from '../features/hotspots/components/HotspotFilters';
import HotspotFolderList from '../features/hotspots/components/HotspotFolderList';
import HotspotDetails, { HotspotDetailsPlaceholder } from '../features/hotspots/components/HotspotDetails';
import HotspotModeSwitch from '../features/hotspots/components/HotspotModeSwitch';
import HotspotPager from '../features/hotspots/components/HotspotPager';
import HotspotSortControl from '../features/hotspots/components/HotspotSortControl';
import HotspotTable from '../features/hotspots/components/HotspotTable';
import HotspotUploadButtons from '../features/hotspots/components/HotspotUploadButtons';
import { useHotspotFolders, useHotspots } from '../features/hotspots/hooks/useHotspots';
import {
  ALL_FOLDERS,
  catalogDefaults,
  HOTSPOT_STATUS_OPTIONS,
  readCatalogParams,
  resolveFolderId,
  writeCatalogParams,
  type CatalogParams,
} from '../features/hotspots/utils/hotspotReview';
import { pageSlice } from '../features/hotspots/utils/pagination';
import { sortOptionsFor } from '../features/hotspots/utils/hotspotSort';
import type { HotspotFolder, HotspotListQuery } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './HotspotsPage.css';

const DETAILS_OPEN_KEY = 'hist.hotspotDetailsOpen';
/** URL parameter of the review cards' page; any other change of the catalog drops it (back to page 1). */
const PAGE_PARAM = 'strona';
/** Cards per page: whole rows at five or six columns (1280 / 1440 px with the details panel open). */
const PAGE_SIZE = 60;

function readDetailsOpen(): boolean {
  try {
    return localStorage.getItem(DETAILS_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeDetailsOpen(open: boolean) {
  try {
    localStorage.setItem(DETAILS_OPEN_KEY, String(open));
  } catch {
    // Not remembered, still works for this visit.
  }
}

/**
 * The hotspot catalog: folders on the left; on the right the work mode, the folder's header, sort and filters
 * above the listed hotspots. The mode presets the filters and order: browse everything, assess untagged
 * hotspots, or reannotate tagged ones.
 */
export default function HotspotsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useLocation();
  const foldersQuery = useHotspotFolders();
  const folders = foldersQuery.data ?? [];
  const requested = readCatalogParams(searchParams);
  // An unknown folder (e.g. just deleted) falls back to the mode's default.
  const params: CatalogParams =
    requested.folder === null || requested.folder === ALL_FOLDERS || folders.some(({ id }) => id === requested.folder)
      ? requested
      : { ...requested, folder: null };
  const folderId = resolveFolderId(params, folders[0]?.id ?? null);
  const folder = folders.find(({ id }) => id === folderId) ?? null;
  const hasList = foldersQuery.data !== undefined && folders.length > 0;

  const update = (changes: Partial<CatalogParams>) =>
    setSearchParams(writeCatalogParams({ ...params, ...changes }), { replace: true });
  const changePage = (page: number) =>
    setSearchParams({ ...writeCatalogParams(params), ...(page > 1 ? { [PAGE_PARAM]: String(page) } : {}) }, { replace: true });

  const activity = <HotspotActivityStrip onSelectFolder={(id) => update({ folder: id })} />;

  return (
    <div className="hotspots-layout tone-soft">
      <aside className="hotspots-sidebar" aria-label="Foldery hotspotów">
        <div className="hotspots-sidebar__header">
          <span className="label-caps">Foldery hotspotów</span>
          {foldersQuery.data !== undefined && <span className="hotspots-sidebar__count">{folders.length}</span>}
        </div>
        {foldersQuery.isPending ? (
          <div className="hotspots-sidebar__state">
            <Spinner label="Wczytywanie folderów…" />
          </div>
        ) : foldersQuery.isError ? (
          <div className="hotspots-sidebar__state">
            <ErrorMessage message={getErrorMessage(foldersQuery.error, 'Nie udało się wczytać folderów.')} />
          </div>
        ) : (
          <HotspotFolderList
            folders={folders}
            selectedId={folderId ?? ALL_FOLDERS}
            onSelect={(id) => update({ folder: id })}
          />
        )}
      </aside>
      <div className="hotspots-page">
        {hasList ? (
          <HotspotCatalogList
            folder={folder}
            folders={folders}
            params={params}
            query={{ folderId, sort: params.sort, order: params.order, status: params.status, tagIds: params.tagIds }}
            linkSearch={search}
            modes={
              <HotspotModeSwitch
                mode={params.mode}
                onChange={(mode) => setSearchParams(writeCatalogParams(catalogDefaults(mode)), { replace: true })}
              />
            }
            activity={activity}
            onChange={update}
            page={Number(searchParams.get(PAGE_PARAM) ?? 1)}
            onPageChange={changePage}
          />
        ) : (
          !foldersQuery.isPending && (
            <div className="hotspots-page__body">
              {activity}
              <div className="hotspots-page__no-folders">
                <span className="hotspots-page__no-folders-title">Brak hotspotów</span>
                <span>
                  Hotspoty trzymane są w folderach. Utwórz folder w panelu po lewej i wgraj do niego obrazy PNG/JPG albo
                  otwórz slajd, kliknij „Hotspoty” na pasku przeglądarki i przeciągnij po obszarze, który ma zostać
                  pocięty na hotspoty.
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

interface HotspotCatalogListProps {
  /** null: every folder. */
  folder: HotspotFolder | null;
  folders: HotspotFolder[];
  params: CatalogParams;
  query: HotspotListQuery;
  linkSearch: string;
  /** The work mode switch, shown above the header. */
  modes: ReactNode;
  /** Hotspots being created, shown above the list. */
  activity: ReactNode;
  onChange: (changes: Partial<CatalogParams>) => void;
  /** Page of the review cards (browsing lists everything in the table). */
  page: number;
  onPageChange: (page: number) => void;
}

function HotspotCatalogList({
  folder,
  folders,
  params,
  query,
  linkSearch,
  modes,
  activity,
  onChange,
  page: requestedPage,
  onPageChange,
}: HotspotCatalogListProps) {
  const { data, isPending, isError, error, isPlaceholderData } = useHotspots(query);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(readDetailsOpen);
  // Managing hotspots (upload, rename, move, delete) belongs to browsing; the review modes only work through them.
  const browsing = params.mode === 'browse';
  // The review cards come in pages (only their thumbnails load); the browse table lists everything.
  const slice = pageSlice(data?.length ?? 0, browsing ? 1 : requestedPage, browsing ? Infinity : PAGE_SIZE);
  const visible = (data ?? []).slice(slice.start, slice.end);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [slice.page]);
  // The panel always shows a hotspot: the clicked one while it is on screen, otherwise the first one on screen.
  const detailHotspot = visible.find((hotspot) => hotspot.id === detailId) ?? visible[0] ?? null;
  const showDetails = (hotspotId: string) => setDetailId(hotspotId);
  const toggleDetails = (open: boolean) => {
    setDetailsOpen(open);
    writeDetailsOpen(open);
  };
  // Only what is listed stays selected (filters and folders change what that is).
  const selected = (data ?? []).filter((hotspot) => selectedIds.has(hotspot.id)).map((hotspot) => hotspot.id);
  // "Select all" covers what is on screen (the current page); ticks on other pages stay.
  const allSelected = visible.length > 0 && visible.every((hotspot) => selectedIds.has(hotspot.id));
  const isEmpty = folder ? folder.hotspot_count === 0 : folders.every((item) => item.hotspot_count === 0);
  const total = folder ? folder.hotspot_count : folders.reduce((sum, item) => sum + item.hotspot_count, 0);
  const toggle = (hotspotId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(hotspotId)) next.add(hotspotId);
      return next;
    });
  const toggleAll = () =>
    setSelectedIds((current) => {
      const next = new Set(current);
      visible.forEach((hotspot) => (allSelected ? next.delete(hotspot.id) : next.add(hotspot.id)));
      return next;
    });

  return (
    <>
      <div className="hotspots-page__main">
        <div className="hotspots-page__top">
          <div className="hotspots-page__header">
            <div className="hotspots-page__heading">
              <h1 className="page-title hotspots-page__title">{folder?.name ?? 'Wszystkie foldery'}</h1>
              <span className="hotspots-page__total">{total}</span>
              {modes}
            </div>
            <div className="hotspots-page__header-actions">
              {folder && browsing && <HotspotUploadButtons folderId={folder.id} folderName={folder.name} />}
              {!detailsOpen && (
                <Button
                  variant="ghost"
                  icon={<PanelRightOpen size={16} />}
                  title="Pokaż panel szczegółów"
                  aria-label="Pokaż panel szczegółów"
                  onClick={() => toggleDetails(true)}
                />
              )}
            </div>
          </div>
          {!isEmpty && (
            <div className="hotspots-page__toolbar">
              <HotspotSortControl
                options={sortOptionsFor(params.mode)}
                sort={params.sort}
                order={params.order}
                onChange={(sort, order) => onChange({ sort, order })}
              />
              {params.mode === 'assess' ? (
                // Assessing always lists the untagged hotspots: the status is fixed and tags are not its focus.
                <select
                  className="hotspot-sort__select hotspots-page__status-locked"
                  aria-label="Status oceny"
                  title="W trybie „Oceniaj” widoczne są tylko nieocenione"
                  disabled
                  value="untagged"
                >
                  <option value="untagged">
                    {HOTSPOT_STATUS_OPTIONS.find((option) => option.value === 'untagged')?.label}
                  </option>
                </select>
              ) : (
                <HotspotFilters mode={params.mode} status={params.status} tagIds={params.tagIds} onChange={onChange} />
              )}
              {data !== undefined && (
                <span className="hotspots-page__shown">
                  wyświetlono {data.length} z {total}
                </span>
              )}
              {!browsing && visible.length > 0 && (
                <label className="hotspots-page__select-all">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = !allSelected && visible.some((hotspot) => selectedIds.has(hotspot.id));
                    }}
                    onChange={toggleAll}
                  />
                  Zaznacz wszystkie
                </label>
              )}
            </div>
          )}
        </div>
        {data !== undefined && selected.length > 0 && (
          <HotspotBulkBar
            hotspotIds={selected}
            onClear={() => setSelectedIds(new Set())}
          />
        )}
        <div className="hotspots-page__content">
          <div className="hotspots-page__body" ref={bodyRef}>
            {activity}
            {isPending ? (
              <Spinner label="Wczytywanie hotspotów…" />
            ) : isError ? (
              <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
            ) : data.length === 0 ? (
              <div className="hotspots-page__empty">
                <span className="hotspots-page__empty-title">
                  {!isEmpty ? 'Brak wyników' : !folder ? 'Brak hotspotów' : 'Folder jest pusty'}
                </span>
                <span className="hotspots-page__empty-text">
                  {!isEmpty
                    ? 'Żaden hotspot nie spełnia wybranych filtrów.'
                    : !folder
                      ? 'Żaden folder nie zawiera jeszcze hotspotów.'
                      : browsing
                        ? 'Wgraj obrazy PNG/JPG przyciskami powyżej albo utwórz hotspoty ze slajdu przyciskiem „Hotspoty” w przeglądarce slajdów.'
                        : 'W tym folderze nie ma jeszcze hotspotów.'}
                </span>
              </div>
            ) : browsing ? (
              <div className={isPlaceholderData ? 'hotspots-page__list--stale' : undefined} aria-busy={isPlaceholderData}>
                <HotspotTable
                  hotspots={data}
                  folders={folders}
                  sort={params.sort}
                  linkSearch={linkSearch}
                  selectedIds={selectedIds}
                  onToggleSelect={toggle}
                  onToggleAll={toggleAll}
                  showFolder={folder === null}
                  detailId={detailsOpen ? (detailHotspot?.id ?? null) : null}
                  onShowDetails={showDetails}
                />
              </div>
            ) : (
              <ul
                className={`hotspots-page__grid${isPlaceholderData ? ' hotspots-page__list--stale' : ''}`}
                aria-busy={isPlaceholderData}
              >
                {visible.map((hotspot) => (
                  <li key={hotspot.id}>
                    <HotspotCard
                      hotspot={hotspot}
                      mode={params.mode}
                      linkSearch={linkSearch}
                      selected={selectedIds.has(hotspot.id)}
                      onToggleSelect={() => toggle(hotspot.id)}
                      detailsOpen={detailsOpen && detailHotspot?.id === hotspot.id}
                      onShowDetails={() => showDetails(hotspot.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
            {!browsing && data !== undefined && (
              <HotspotPager
                page={slice.page}
                pageCount={slice.pageCount}
                start={slice.start}
                end={slice.end}
                total={data.length}
                onChange={onPageChange}
              />
            )}
          </div>
        </div>
      </div>
      {detailsOpen &&
        (detailHotspot ? (
          <HotspotDetails
            // A new hotspot starts with a fresh panel (no half-typed name or old error).
            key={detailHotspot.id}
            hotspot={detailHotspot}
            folders={folders}
            linkSearch={linkSearch}
            manage={browsing}
            onCollapse={() => toggleDetails(false)}
          />
        ) : (
          <HotspotDetailsPlaceholder
            text={isPending ? 'Wczytywanie…' : 'Brak hotspotu do pokazania.'}
            onCollapse={() => toggleDetails(false)}
          />
        ))}
    </>
  );
}
