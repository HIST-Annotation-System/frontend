import { FilterX, FolderOpen, Folders } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import HotspotActivityStrip from '../features/hotspots/components/HotspotActivityStrip';
import HotspotBulkBar from '../features/hotspots/components/HotspotBulkBar';
import HotspotCard from '../features/hotspots/components/HotspotCard';
import HotspotFilters from '../features/hotspots/components/HotspotFilters';
import HotspotFolderList from '../features/hotspots/components/HotspotFolderList';
import HotspotModeSwitch from '../features/hotspots/components/HotspotModeSwitch';
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
import { sortOptionsFor } from '../features/hotspots/utils/hotspotSort';
import type { HotspotFolder, HotspotListQuery } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './HotspotsPage.css';

/** "1 hotspot", "3 hotspoty", "12 hotspotów". */
function hotspotCount(count: number): string {
  const tens = count % 100;
  const units = count % 10;
  const word =
    count === 1 ? 'hotspot' : units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? 'hotspoty' : 'hotspotów';
  return `${count} ${word}`;
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

  const activity = <HotspotActivityStrip onSelectFolder={(id) => update({ folder: id })} />;

  return (
    <div className="hotspots-layout">
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
          />
        ) : (
          !foldersQuery.isPending && (
            <div className="hotspots-page__body">
              {activity}
              <div className="hotspots-page__no-folders">
                <Folders size={24} aria-hidden="true" />
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
}: HotspotCatalogListProps) {
  const { data, isPending, isError, error, isPlaceholderData } = useHotspots(query);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  // Only what is listed stays selected (filters and folders change what that is).
  const selected = (data ?? []).filter((hotspot) => selectedIds.has(hotspot.id)).map((hotspot) => hotspot.id);
  const allSelected = data !== undefined && data.length > 0 && selected.length === data.length;
  const isEmpty = folder ? folder.hotspot_count === 0 : folders.every((item) => item.hotspot_count === 0);
  const total = folder ? folder.hotspot_count : folders.reduce((sum, item) => sum + item.hotspot_count, 0);
  // Managing hotspots (upload, rename, move, delete) belongs to browsing; the review modes only work through them.
  const browsing = params.mode === 'browse';

  const toggle = (hotspotId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(hotspotId)) next.add(hotspotId);
      return next;
    });
  const toggleAll = () => setSelectedIds(allSelected || !data ? new Set() : new Set(data.map((hotspot) => hotspot.id)));

  return (
    <>
      <div className="hotspots-page__top">
        <div className="hotspots-page__modes">
          <span className="label-caps">Tryb pracy</span>
          {modes}
        </div>
        <div className="hotspots-page__header">
          <div className="hotspots-page__heading">
            <h1 className="page-title hotspots-page__title">{folder?.name ?? 'Wszystkie foldery'}</h1>
            <span className="hotspots-page__total">{hotspotCount(total)}</span>
          </div>
          {folder && browsing && <HotspotUploadButtons folderId={folder.id} folderName={folder.name} />}
        </div>
        {!isEmpty && (
          <div className="hotspots-page__toolbar">
            <HotspotSortControl
              options={sortOptionsFor(params.mode)}
              sort={params.sort}
              order={params.order}
              onChange={(sort, order) => onChange({ sort, order })}
            />
            <span className="hotspots-page__divider" aria-hidden="true" />
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
          </div>
        )}
      </div>
      <div className={`hotspots-page__body${selected.length > 0 ? ' hotspots-page__body--bulk' : ''}`}>
        {activity}
        {isPending ? (
          <Spinner label="Wczytywanie hotspotów…" />
        ) : isError ? (
          <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
        ) : data.length === 0 ? (
          <div className="hotspots-page__empty">
            <span className="hotspots-page__empty-icon">
              {!isEmpty ? <FilterX size={20} aria-hidden="true" /> : <FolderOpen size={20} aria-hidden="true" />}
            </span>
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
            />
          </div>
        ) : (
          <ul
            className={`hotspots-page__grid${isPlaceholderData ? ' hotspots-page__list--stale' : ''}`}
            aria-busy={isPlaceholderData}
          >
            {data.map((hotspot) => (
              <li key={hotspot.id}>
                <HotspotCard
                  hotspot={hotspot}
                  mode={params.mode}
                  sort={params.sort}
                  linkSearch={linkSearch}
                  selected={selectedIds.has(hotspot.id)}
                  onToggleSelect={() => toggle(hotspot.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {data !== undefined && selected.length > 0 && (
        <HotspotBulkBar
          hotspotIds={selected}
          visibleCount={allSelected ? undefined : data.length}
          onSelectVisible={toggleAll}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </>
  );
}
