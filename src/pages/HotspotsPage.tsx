import { useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import HotspotActivityStrip from '../features/hotspots/components/HotspotActivityStrip';
import HotspotCard from '../features/hotspots/components/HotspotCard';
import HotspotFolderList from '../features/hotspots/components/HotspotFolderList';
import HotspotSortControl from '../features/hotspots/components/HotspotSortControl';
import HotspotUploadButtons from '../features/hotspots/components/HotspotUploadButtons';
import { useHotspotFolders, useHotspots } from '../features/hotspots/hooks/useHotspots';
import {
  DEFAULT_HOTSPOT_SORT,
  DEFAULT_SORT_ORDER,
  parseHotspotSort,
  parseSortOrder,
} from '../features/hotspots/utils/hotspotSort';
import type { HotspotFolder, HotspotSort, SortOrder } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import '../features/slides/components/SlideList.css';
import './HotspotsPage.css';
import './SlideViewerPage.css';

const FOLDER_PARAM = 'folder';
const SORT_PARAM = 'sort';
const ORDER_PARAM = 'order';

/** The hotspot catalog: folders on the left, the selected folder's hotspots on the right. */
export default function HotspotsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const foldersQuery = useHotspotFolders();
  const folders = foldersQuery.data ?? [];
  const requestedId = searchParams.get(FOLDER_PARAM);
  // An unknown or missing folder (e.g. just deleted) falls back to the first one.
  const selected = folders.find((folder) => folder.id === requestedId) ?? folders[0] ?? null;

  const sort = parseHotspotSort(searchParams.get(SORT_PARAM));
  const order = parseSortOrder(searchParams.get(ORDER_PARAM));

  // The chosen order stays when switching folders; defaults are left out of the URL.
  const updateParams = (folderId: string | null, nextSort: HotspotSort, nextOrder: SortOrder) => {
    const params: Record<string, string> = {};
    if (folderId) params[FOLDER_PARAM] = folderId;
    if (nextSort !== DEFAULT_HOTSPOT_SORT) params[SORT_PARAM] = nextSort;
    if (nextOrder !== DEFAULT_SORT_ORDER) params[ORDER_PARAM] = nextOrder;
    setSearchParams(params, { replace: true });
  };
  const select = (folderId: string) => updateParams(folderId, sort, order);

  return (
    <div className="viewer-page">
      <aside className="viewer-page__sidebar">
        <SidebarSection title="Foldery hotspotów" grow>
          {foldersQuery.isPending ? (
            <Spinner label="Wczytywanie folderów…" />
          ) : foldersQuery.isError ? (
            <ErrorMessage message={getErrorMessage(foldersQuery.error, 'Nie udało się wczytać folderów.')} />
          ) : (
            <HotspotFolderList folders={folders} selectedId={selected?.id ?? null} onSelect={select} />
          )}
        </SidebarSection>
      </aside>
      <div className="hotspots-page">
        <HotspotActivityStrip onSelectFolder={select} />
        {selected ? (
          <FolderContents
            folder={selected}
            folders={folders}
            sort={sort}
            order={order}
            onSortChange={(nextSort, nextOrder) => updateParams(selected.id, nextSort, nextOrder)}
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

interface FolderContentsProps {
  folder: HotspotFolder;
  folders: HotspotFolder[];
  sort: HotspotSort;
  order: SortOrder;
  onSortChange: (sort: HotspotSort, order: SortOrder) => void;
}

function FolderContents({ folder, folders, sort, order, onSortChange }: FolderContentsProps) {
  const { data, isPending, isError, error, isPlaceholderData } = useHotspots(folder.id, sort, order);

  return (
    <div className="hotspots-page__inner">
      <div className="hotspots-page__header">
        <h1 className="hotspots-page__title">{folder.name}</h1>
        <HotspotUploadButtons folderId={folder.id} folderName={folder.name} />
      </div>
      {folder.hotspot_count > 0 && <HotspotSortControl sort={sort} order={order} onChange={onSortChange} />}
      {isPending ? (
        <Spinner label="Wczytywanie hotspotów…" />
      ) : isError ? (
        <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
      ) : data.length === 0 ? (
        <p className="slide-list__empty">
          Folder jest pusty. Wgraj obrazy PNG/JPG przyciskami powyżej albo utwórz hotspoty ze slajdu przyciskiem
          „Hotspoty” w przeglądarce slajdów.
        </p>
      ) : (
        <ul className={`slide-list${isPlaceholderData ? ' hotspots-page__list--stale' : ''}`} aria-busy={isPlaceholderData}>
          {data.map((hotspot) => (
            <li key={hotspot.id}>
              <HotspotCard hotspot={hotspot} folders={folders} sort={sort} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
