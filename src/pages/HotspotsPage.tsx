import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
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
  HOTSPOT_MODES,
  readCatalogParams,
  resolveFolderId,
  writeCatalogParams,
  type CatalogParams,
} from '../features/hotspots/utils/hotspotReview';
import { sortOptionsFor } from '../features/hotspots/utils/hotspotSort';
import type { HotspotFolder, HotspotListQuery } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import '../features/slides/components/SlideList.css';
import './HotspotsPage.css';
import './SlideViewerPage.css';

/**
 * The hotspot catalog: the work mode and folders on the left, the listed hotspots on the right. The mode presets
 * the filters and order: browse everything, assess untagged hotspots, or reannotate tagged ones.
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

  return (
    <div className="viewer-page">
      <aside className="viewer-page__sidebar">
        <SidebarSection title="Tryb pracy" compact>
          <HotspotModeSwitch
            mode={params.mode}
            onChange={(mode) => setSearchParams(writeCatalogParams(catalogDefaults(mode)), { replace: true })}
          />
        </SidebarSection>
        <SidebarSection title="Foldery hotspotów" grow>
          {foldersQuery.isPending ? (
            <Spinner label="Wczytywanie folderów…" />
          ) : foldersQuery.isError ? (
            <ErrorMessage message={getErrorMessage(foldersQuery.error, 'Nie udało się wczytać folderów.')} />
          ) : (
            <HotspotFolderList
              folders={folders}
              selectedId={folderId ?? ALL_FOLDERS}
              onSelect={(id) => update({ folder: id })}
            />
          )}
        </SidebarSection>
      </aside>
      <div className="hotspots-page">
        <HotspotActivityStrip onSelectFolder={(id) => update({ folder: id })} />
        {hasList ? (
          <HotspotCatalogList
            folder={folder}
            folders={folders}
            params={params}
            query={{ folderId, sort: params.sort, order: params.order, status: params.status, tagIds: params.tagIds }}
            linkSearch={search}
            onChange={update}
          />
        ) : (
          !foldersQuery.isPending && (
            <p className="slide-list__empty">
              Brak hotspotów. Utwórz folder po lewej i wgraj do niego obrazy PNG/JPG albo otwórz slajd, kliknij
              „Hotspoty” na pasku przeglądarki i przeciągnij po obszarze, który ma zostać pocięty na hotspoty.
            </p>
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
  onChange: (changes: Partial<CatalogParams>) => void;
}

function HotspotCatalogList({ folder, folders, params, query, linkSearch, onChange }: HotspotCatalogListProps) {
  const { data, isPending, isError, error, isPlaceholderData } = useHotspots(query);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  // Only what is listed stays selected (filters and folders change what that is).
  const selected = (data ?? []).filter((hotspot) => selectedIds.has(hotspot.id)).map((hotspot) => hotspot.id);
  const allSelected = data !== undefined && data.length > 0 && selected.length === data.length;
  const isEmpty = folder ? folder.hotspot_count === 0 : folders.every((item) => item.hotspot_count === 0);
  // Managing hotspots (upload, rename, move, delete) belongs to browsing; the review modes only work through them.
  const browsing = params.mode === 'browse';
  const mode = HOTSPOT_MODES.find((option) => option.value === params.mode);

  const toggle = (hotspotId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(hotspotId)) next.add(hotspotId);
      return next;
    });

  return (
    <div className="hotspots-page__inner">
      <div className="hotspots-page__header">
        <div className="hotspots-page__heading">
          {/* The mode is the page's heading; the folder and what the mode is for come below it. */}
          <h1 className="hotspots-page__title">{mode?.label}</h1>
          <p className="hotspots-page__subtitle">
            <span className="hotspots-page__folder">{folder?.name ?? 'Wszystkie foldery'}</span>
            {' · '}
            {mode?.description}
          </p>
        </div>
        {folder && browsing && <HotspotUploadButtons folderId={folder.id} folderName={folder.name} />}
      </div>
      {!isEmpty && (
        <div className="hotspots-page__toolbar">
          {/* Assessing always lists the untagged hotspots: tags are not its focus. */}
          {params.mode !== 'assess' && (
            <HotspotFilters mode={params.mode} status={params.status} tagIds={params.tagIds} onChange={onChange} />
          )}
          <HotspotSortControl
            options={sortOptionsFor(params.mode)}
            sort={params.sort}
            order={params.order}
            onChange={(sort, order) => onChange({ sort, order })}
          />
        </div>
      )}
      {data !== undefined && data.length > 0 && (
        <div className="hotspots-page__selection">
          <label className="hotspots-page__select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelectedIds(allSelected ? new Set() : new Set(data.map((hotspot) => hotspot.id)))}
            />
            Zaznacz wszystkie ({data.length})
          </label>
          {selected.length > 0 && <HotspotBulkBar hotspotIds={selected} onClear={() => setSelectedIds(new Set())} />}
        </div>
      )}
      {isPending ? (
        <Spinner label="Wczytywanie hotspotów…" />
      ) : isError ? (
        <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
      ) : data.length === 0 ? (
        <p className="slide-list__empty">
          {!isEmpty
            ? 'Żaden hotspot nie spełnia wybranych filtrów.'
            : !folder
              ? 'Żaden folder nie zawiera jeszcze hotspotów.'
              : browsing
                ? 'Folder jest pusty. Wgraj obrazy PNG/JPG przyciskami powyżej albo utwórz hotspoty ze slajdu przyciskiem „Hotspoty” w przeglądarce slajdów.'
                : 'Folder jest pusty.'}
        </p>
      ) : browsing ? (
        <div className={isPlaceholderData ? 'hotspots-page__list--stale' : undefined} aria-busy={isPlaceholderData}>
          <HotspotTable
            hotspots={data}
            folders={folders}
            sort={params.sort}
            linkSearch={linkSearch}
            selectedIds={selectedIds}
            onToggleSelect={toggle}
          />
        </div>
      ) : (
        <ul className={`slide-list${isPlaceholderData ? ' hotspots-page__list--stale' : ''}`} aria-busy={isPlaceholderData}>
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
  );
}
