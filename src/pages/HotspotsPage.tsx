import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { FolderOpen, SearchX } from 'lucide-react';
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
import HotspotUploader from '../features/hotspots/components/HotspotUploader';
import PaneHandle from '../features/viewer/components/PaneHandle';
import { useHotspotDrop } from '../features/hotspots/hooks/useHotspotDrop';
import { useHotspotFolders, useHotspots } from '../features/hotspots/hooks/useHotspots';
import {
  ALL_FOLDERS,
  catalogDefaults,
  readCatalogParams,
  catalogQuery,
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
/** URL parameter of the catalog page; any other change of the catalog drops it (back to page 1). */
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
  useDocumentTitle('Hotspoty');
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
            query={catalogQuery(params, folderId)}
            linkSearch={search}
            modes={
              <HotspotModeSwitch
                mode={params.mode}
                // A new mode resets its filters and order but stays in the folder being looked at (or all of them).
                onChange={(mode) =>
                  setSearchParams(
                    writeCatalogParams({ ...catalogDefaults(mode), folder: folderId }),
                    { replace: true },
                  )
                }
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
                  Hotspoty trzymane są w folderach. Utwórz folder w panelu po lewej i wgraj do niego obrazy albo
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
  /** Page of the review cards or of the browse table. */
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
  const { data: loaded, isPending, isError, error, isPlaceholderData } = useHotspots(query);
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchInput);
  const needle = search.trim().toLowerCase();
  const data =
    needle && loaded
      ? loaded.filter(
          (hotspot) => hotspot.name.toLowerCase().includes(needle) || hotspot.slide_name?.toLowerCase().includes(needle),
        )
      : loaded;
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(readDetailsOpen);
  const slice = pageSlice(data?.length ?? 0, requestedPage, PAGE_SIZE);
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
  const showBulk = visible.length > 0;
  // Assessing lists untagged hotspots, so the cards' tag lines only take room when some card on the page uses them.
  const tagLines = visible.some((hotspot) => hotspot.tags.length > 0);
  // Images dropped on the list go into the folder being browsed.
  const { isDragging, dropHandlers } = useHotspotDrop(folder, true);
  const isEmpty = folder ? folder.hotspot_count === 0 : folders.every((item) => item.hotspot_count === 0);
  const total = folder ? folder.hotspot_count : folders.reduce((sum, item) => sum + item.hotspot_count, 0);
  // Shown out of the folder's total while a filter or the search holds some hotspots back.
  const countLabel = data !== undefined && data.length !== total ? `${data.length} z ${total}` : total;
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
      <div className="hotspots-page__main" {...dropHandlers}>
        <div className="hotspots-page__top">
          <div className="hotspots-page__header">
            <div className="hotspots-page__heading">
              <h1 className="page-title hotspots-page__title">{folder?.name ?? 'Wszystkie foldery'}</h1>
              <span className="hotspots-page__total">{countLabel}</span>
              {modes}
            </div>
            <div className="hotspots-page__header-actions">
              {folder && <HotspotUploader folderId={folder.id} folderName={folder.name} />}
            </div>
          </div>
          {!isEmpty && (
            <div className="hotspots-page__toolbar">
              <label className="search-field">
                <input
                  ref={searchInput}
                  type="search"
                  placeholder="Szukaj nazwy  ( / )"
                  aria-label="Szukaj hotspotu"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setSearch('');
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
              {/* Assessing always lists the untagged hotspots: nothing to filter. */}
              {params.mode !== 'assess' && (
                <HotspotFilters mode={params.mode} status={params.status} tagIds={params.tagIds} onChange={onChange} />
              )}
              <span className="hotspots-page__spacer" />
              <HotspotSortControl
                options={sortOptionsFor(params.mode)}
                sort={params.sort}
                order={params.order}
                onChange={(sort, order) => onChange({ sort, order })}
              />
            </div>
          )}
        </div>
        <div className="hotspots-page__content">
          <div className="hotspots-page__body" ref={bodyRef}>
            {activity}
            {isPending ? (
              <ul className="hotspots-page__grid" aria-busy="true" aria-label="Wczytywanie hotspotów…">
                {Array.from({ length: 12 }, (_, index) => (
                  <li key={index} className="hotspot-card hotspot-card--skeleton" aria-hidden="true">
                    <span className="hotspot-card__thumb" />
                    <span className="hotspot-card__line--skeleton" />
                    <span className="hotspot-card__line--skeleton" style={{ width: '60%' }} />
                  </li>
                ))}
              </ul>
            ) : isError ? (
              <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
            ) : data?.length === 0 ? (
              <div className="hotspots-page__empty">
                {isEmpty ? <FolderOpen size={32} aria-hidden="true" /> : <SearchX size={32} aria-hidden="true" />}
                <span className="hotspots-page__empty-title">
                  {!isEmpty ? 'Brak wyników' : !folder ? 'Brak hotspotów' : 'Folder jest pusty'}
                </span>
                <span className="hotspots-page__empty-text">
                  {!isEmpty
                    ? 'Żaden hotspot nie spełnia wyszukiwania ani filtrów.'
                    : !folder
                      ? 'Żaden folder nie zawiera jeszcze hotspotów.'
                      : 'Wgraj obrazy albo przeciągnij je tutaj. Hotspoty można też utworzyć ze slajdu przyciskiem „Hotspoty” w przeglądarce slajdów.'}
                </span>
                {!isEmpty && search && <Button onClick={() => setSearch('')}>Wyczyść wyszukiwanie</Button>}
                {isEmpty && folder && <HotspotUploader folderId={folder.id} folderName={folder.name} />}
              </div>
            ) : (
              <ul
                className={`hotspots-page__grid${selected.length > 0 ? ' hotspots-page__grid--selecting' : ''}${isPlaceholderData ? ' hotspots-page__list--stale' : ''}`}
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
                      tagLines={tagLines}
                      detailsOpen={detailsOpen && detailHotspot?.id === hotspot.id}
                      onShowDetails={() => showDetails(hotspot.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* One bottom area outside the scrolling list, so it never covers the last row: selection left, pages right. */}
        {data !== undefined && (showBulk || slice.pageCount > 1) && (
          <div className="hotspots-page__footer">
            {showBulk ? (
              <HotspotBulkBar
                hotspotIds={selected}
                onClear={() => setSelectedIds(new Set())}
                selectAll={{
                  checked: allSelected,
                  indeterminate: !allSelected && visible.some((hotspot) => selectedIds.has(hotspot.id)),
                  onToggle: toggleAll,
                }}
              />
            ) : (
              <span className="hotspots-page__footer-spacer" />
            )}
            <HotspotPager
              page={slice.page}
              pageCount={slice.pageCount}
              start={slice.start}
              end={slice.end}
              total={data.length}
              onChange={onPageChange}
            />
          </div>
        )}
        {isDragging && (
          <div className="hotspots-page__drop" aria-hidden="true">
            {folder ? (
              <p>
                <strong>Upuść obrazy lub foldery</strong>
                <span>Zostaną wgrane do folderu „{folder.name}”</span>
              </p>
            ) : (
              <p>
                <strong>Najpierw wybierz folder</strong>
                <span>Obrazy wgrywa się do folderu wybranego na liście po lewej</span>
              </p>
            )}
          </div>
        )}
      </div>
      {detailHotspot && (
        <PaneHandle open={detailsOpen} onToggle={() => toggleDetails(!detailsOpen)} label="Szczegóły" />
      )}
      {detailsOpen &&
        (detailHotspot ? (
          <HotspotDetails
            // A new hotspot starts with a fresh panel (no half-typed name or old error).
            key={detailHotspot.id}
            hotspot={detailHotspot}
            folders={folders}
            linkSearch={linkSearch}
          />
        ) : (
          <HotspotDetailsPlaceholder text={isPending ? 'Wczytywanie…' : 'Brak hotspotu do pokazania.'} />
        ))}
    </>
  );
}
