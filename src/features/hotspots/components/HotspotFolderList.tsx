import { Folder, Folders } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import type { HotspotFolder } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotMutations } from '../hooks/useHotspots';
import { ALL_FOLDERS } from '../utils/hotspotReview';
import './Hotspots.css';

interface HotspotFolderListProps {
  folders: HotspotFolder[];
  /** A folder id, or `ALL_FOLDERS`. */
  selectedId: string | null;
  /** Gets a folder id, or `ALL_FOLDERS`. */
  onSelect: (folderId: string) => void;
}

/**
 * The catalog's folder tree: pick one (or all of them) to list. Below the tree: add a folder, and rename or delete
 * (with its hotspots) the selected one.
 */
export default function HotspotFolderList({ folders, selectedId, onSelect }: HotspotFolderListProps) {
  const { createFolder, isCreatingFolder, renameFolder, isRenamingFolder, deleteFolder, isDeletingFolder } =
    useHotspotMutations();
  const [newName, setNewName] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<HotspotFolder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = folders.find((folder) => folder.id === selectedId);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const name = newName?.trim();
    if (!name) return;
    setError(null);
    try {
      const folder = await createFolder(name);
      setNewName(null);
      onSelect(folder.id);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się utworzyć folderu.'));
    }
  };

  const saveName = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    const current = folders.find((folder) => folder.id === editing.id);
    if (!name || name === current?.name) {
      setEditing(null);
      return;
    }
    setError(null);
    try {
      await renameFolder({ folderId: editing.id, name });
      setEditing(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się zmienić nazwy folderu.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setError(null);
    try {
      await deleteFolder(deleting.id);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się usunąć folderu.'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <nav className="hotspot-folders" aria-label="Foldery">
      <h2 className="hotspot-folders__title">Foldery</h2>
      <ul className="hotspot-folders__list">
        <li>
          <button
            type="button"
            className="hotspot-folders__item"
            aria-current={selectedId === ALL_FOLDERS}
            onClick={() => onSelect(ALL_FOLDERS)}
          >
            <Folders size={14} aria-hidden="true" />
            <span className="hotspot-folders__name">Wszystkie</span>
            <span className="hotspot-folders__count mono-data">
              {folders.reduce((total, folder) => total + folder.hotspot_count, 0)}
            </span>
          </button>
        </li>
        {folders.map((folder) => (
          <li key={folder.id}>
            {editing?.id === folder.id ? (
              <input
                className="field hotspot-folders__input"
                value={editing.name}
                autoFocus
                maxLength={255}
                aria-label="Nazwa folderu (Enter zapisuje, Esc anuluje)"
                disabled={isRenamingFolder}
                onChange={(event) => setEditing({ id: folder.id, name: event.target.value })}
                onBlur={() => void saveName()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveName();
                  if (event.key === 'Escape') setEditing(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="hotspot-folders__item"
                aria-current={folder.id === selectedId}
                onClick={() => onSelect(folder.id)}
                onDoubleClick={() => setEditing({ id: folder.id, name: folder.name })}
              >
                <Folder size={14} aria-hidden="true" />
                <span className="hotspot-folders__name" title={folder.name}>
                  {folder.name}
                </span>
                <span className="hotspot-folders__count mono-data">{folder.hotspot_count}</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="hotspot-folders__actions">
        {newName !== null ? (
          <form className="hotspot-folders__new" onSubmit={(event) => void add(event)}>
            <input
              className="field"
              value={newName}
              autoFocus
              placeholder="Nazwa folderu"
              aria-label="Nazwa nowego folderu"
              maxLength={255}
              disabled={isCreatingFolder}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setNewName(null)}
            />
            <Button type="submit" small disabled={isCreatingFolder || !newName.trim()}>
              Utwórz
            </Button>
            <Button small variant="ghost" aria-label="Anuluj" onClick={() => setNewName(null)}>
              ×
            </Button>
          </form>
        ) : (
          <Button small block onClick={() => setNewName('')}>
            Nowy folder…
          </Button>
        )}
        {selected && (
          <div className="hotspot-folders__selected">
            <Button small onClick={() => setEditing({ id: selected.id, name: selected.name })}>
              Zmień nazwę
            </Button>
            <Button small variant="danger" onClick={() => setDeleting(selected)}>
              Usuń…
            </Button>
          </div>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      </div>

      <Modal title="Usuń folder" open={deleting !== null} onClose={() => setDeleting(null)}>
        <p>
          Czy na pewno chcesz usunąć folder „{deleting?.name}”? Wszystkie jego hotspoty ({deleting?.hotspot_count ?? 0})
          wraz z anotacjami zostaną trwale usunięte. Tej operacji nie można cofnąć.
        </p>
        <div className="modal-actions">
          <Button onClick={() => setDeleting(null)} disabled={isDeletingFolder}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeletingFolder}>
            {isDeletingFolder ? 'Usuwanie…' : 'Usuń folder'}
          </Button>
        </div>
      </Modal>
    </nav>
  );
}
