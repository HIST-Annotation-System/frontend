import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import Spinner from '../components/ui/Spinner';
import HotspotActivityStrip from '../features/hotspots/components/HotspotActivityStrip';
import HotspotBulkBar from '../features/hotspots/components/HotspotBulkBar';
import HotspotCard from '../features/hotspots/components/HotspotCard';
import HotspotFilters from '../features/hotspots/components/HotspotFilters';
import HotspotFolderList from '../features/hotspots/components/HotspotFolderList';
import HotspotModeSwitch from '../features/hotspots/components/HotspotModeSwitch';
import HotspotPreview from '../features/hotspots/components/HotspotPreview';
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
  type HotspotMode,
} from '../features/hotspots/utils/hotspotReview';
import { sortOptionsFor } from '../features/hotspots/utils/hotspotSort';
import type { HotspotFolder, HotspotListQuery } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import './HotspotsPage.css';

/**
 * The hotspot catalog: the folder tree on the left, the listed hotspots in the middle (and, when browsing, the
 * selected one on the right). The mode presets the filters and order: browse everything, assess untagged hotspots,
 * or reannotate tagged ones.
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
    <div className="hotspots-page">
      <aside className="hotspots-page__folders">
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
      </aside>
      {hasList ? (
        <HotspotCatalogList
          folder={folder}
          folders={folders}
          params={params}
          query={{ folderId, sort: params.sort, order: params.order, status: params.status, tagIds: params.tagIds }}
          linkSearch={search}
          onChange={update}
          onModeChange={(mode) => setSearchParams(writeCatalogParams(catalogDefaults(mode)), { replace: true })}
          onSelectFolder={(id) => update({ folder: id })}
        />
      ) : (
        !foldersQuery.isPending && (
          <p className="hotspots-page__empty">
            Brak hotspotów. Utwórz folder po lewej i wgraj do niego obrazy PNG/JPG albo otwórz slajd, wybierz Siatkę
            lub Pędzel i zaznacz obszar, który ma zostać pocięty na hotspoty.
          </p>
        )
      )}
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
  onModeChange: (mode: HotspotMode) => void;
  onSelectFolder: (folderId: string) => void;
}

function HotspotCatalogList({
  folder,
  folders,
  params,
  query,
  linkSearch,
  onChange,
  onModeChange,
  onSelectFolder,
}: HotspotCatalogListProps) {
  const { data, isPending, isError, error, isPlaceholderData } = useHotspots(query);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Only what is listed stays selected (filters and folders change what that is).
  const selected = (data ?? []).filter((hotspot) => selectedIds.has(hotspot.id)).map((hotspot) => hotspot.id);
  const allSelected = data !== undefined && data.length > 0 && selected.length === data.length;
  const isEmpty = folder ? folder.hotspot_count === 0 : folders.every((item) => item.hotspot_count === 0);
  // Managing hotspots (upload, rename, move, delete) belongs to browsing; the review modes only work through them.
  const browsing = params.mode === 'browse';
  const mode = HOTSPOT_MODES.find((option) => option.value === params.mode);
  // The preview pane shows the clicked row, or the first one.
  const preview = data?.find((hotspot) => hotspot.id === previewId) ?? data?.[0];

  const toggle = (hotspotId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(hotspotId)) next.add(hotspotId);
      return next;
    });

  return (
    <>
      <section className="hotspots-page__main" aria-label="Hotspoty">
        <div className="page-strip">
          <h1 className="page-strip__title" title={mode?.description}>
            {folder?.name ?? 'Wszystkie foldery'}
            {data !== undefined && <span className="page-strip__count">{data.length}</span>}
          </h1>
          <HotspotModeSwitch mode={params.mode} onChange={onModeChange} />
          <span className="page-strip__spacer" />
          {folder && browsing && <HotspotUploadButtons folderId={folder.id} folderName={folder.name} />}
        </div>
        {!isEmpty && (
          <div className="page-strip hotspots-page__toolbar">
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
            <span className="page-strip__spacer" />
            {data !== undefined && data.length > 0 && (
              <label className="hotspots-page__select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelectedIds(allSelected ? new Set() : new Set(data.map((hotspot) => hotspot.id)))}
                />
                Zaznacz wszystkie
              </label>
            )}
          </div>
        )}
        {selected.length > 0 && <HotspotBulkBar hotspotIds={selected} onClear={() => setSelectedIds(new Set())} />}
        <HotspotActivityStrip onSelectFolder={onSelectFolder} />
        <div
          className={`hotspots-page__scroll${isPlaceholderData ? ' hotspots-page__scroll--stale' : ''}`}
          aria-busy={isPlaceholderData}
        >
          {isPending ? (
            <Spinner label="Wczytywanie hotspotów…" />
          ) : isError ? (
            <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
          ) : data.length === 0 ? (
            <p className="hotspots-page__empty">
              {!isEmpty
                ? 'Żaden hotspot nie spełnia wybranych filtrów.'
                : !folder
                  ? 'Żaden folder nie zawiera jeszcze hotspotów.'
                  : browsing
                    ? 'Folder jest pusty. Wgraj obrazy PNG/JPG przyciskami powyżej albo utwórz hotspoty ze slajdu narzędziem Siatka lub Pędzel.'
                    : 'Folder jest pusty.'}
            </p>
          ) : browsing ? (
            <HotspotTable
              hotspots={data}
              sort={params.sort}
              linkSearch={linkSearch}
              previewId={preview?.id ?? null}
              onPreview={setPreviewId}
              selectedIds={selectedIds}
              onToggleSelect={toggle}
            />
          ) : (
            <ul className="hotspot-sheet">
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
      </section>
      {browsing && (
        <aside className="hotspots-page__preview" aria-label="Podgląd hotspotu">
          {preview ? (
            <HotspotPreview key={preview.id} hotspot={preview} folders={folders} linkSearch={linkSearch} />
          ) : (
            <p className="hotspots-page__empty">Wybierz hotspot z listy.</p>
          )}
        </aside>
      )}
    </>
  );
}
