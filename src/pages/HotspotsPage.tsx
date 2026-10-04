import { useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import SidebarSection from '../components/ui/SidebarSection';
import Spinner from '../components/ui/Spinner';
import HotspotCard from '../features/hotspots/components/HotspotCard';
import HotspotFolderList from '../features/hotspots/components/HotspotFolderList';
import HotspotUploadButtons from '../features/hotspots/components/HotspotUploadButtons';
import { useHotspotFolders, useHotspots } from '../features/hotspots/hooks/useHotspots';
import type { HotspotFolder } from '../types/hotspot';
import { getErrorMessage } from '../utils/errors';
import '../features/slides/components/SlideList.css';
import './HotspotsPage.css';
import './SlideViewerPage.css';

const FOLDER_PARAM = 'folder';

/** The hotspot catalog: folders on the left, the selected folder's hotspots on the right. */
export default function HotspotsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const foldersQuery = useHotspotFolders();
  const folders = foldersQuery.data ?? [];
  const requestedId = searchParams.get(FOLDER_PARAM);
  // An unknown or missing folder (e.g. just deleted) falls back to the first one.
  const selected = folders.find((folder) => folder.id === requestedId) ?? folders[0] ?? null;

  const select = (folderId: string) => setSearchParams({ [FOLDER_PARAM]: folderId }, { replace: true });

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
        {selected ? (
          <FolderContents folder={selected} folders={folders} />
        ) : (
          !foldersQuery.isPending && (
            <p className="slide-list__empty">
              Brak hotspotów. Utwórz folder po lewej i wgraj do niego obrazy PNG/JPG albo otwórz slajd, kliknij
              „Hotspot” na pasku przeglądarki i zapisz wybrany kwadratowy fragment.
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
}

function FolderContents({ folder, folders }: FolderContentsProps) {
  const { data, isPending, isError, error } = useHotspots(folder.id);

  return (
    <div className="hotspots-page__inner">
      <div className="hotspots-page__header">
        <h1 className="hotspots-page__title">{folder.name}</h1>
        <HotspotUploadButtons folderId={folder.id} folderName={folder.name} />
      </div>
      {isPending ? (
        <Spinner label="Wczytywanie hotspotów…" />
      ) : isError ? (
        <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać hotspotów.')} />
      ) : data.length === 0 ? (
        <p className="slide-list__empty">
          Folder jest pusty. Wgraj obrazy PNG/JPG przyciskami powyżej albo zapisz hotspot ze slajdu przyciskiem
          „Hotspot” w przeglądarce slajdów.
        </p>
      ) : (
        <ul className="slide-list">
          {data.map((hotspot) => (
            <li key={hotspot.id}>
              <HotspotCard hotspot={hotspot} folders={folders} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
