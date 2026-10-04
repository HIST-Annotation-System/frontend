import { Check, Folder, FolderPlus, Pencil, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import type { HotspotFolder } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotMutations } from '../hooks/useHotspots';
import './Hotspots.css';

interface HotspotFolderListProps {
  folders: HotspotFolder[];
  selectedId: string | null;
  onSelect: (folderId: string) => void;
}

/** The catalog's folders: pick one to browse, add, rename or delete (with its hotspots). */
export default function HotspotFolderList({ folders, selectedId, onSelect }: HotspotFolderListProps) {
  const { createFolder, isCreatingFolder, renameFolder, isRenamingFolder, deleteFolder, isDeletingFolder } =
    useHotspotMutations();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<HotspotFolder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const folder = await createFolder(name);
      setNewName('');
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
    <div className="hotspot-folders">
      <form className="hotspot-folders__new" onSubmit={(event) => void add(event)}>
        <input
          value={newName}
          placeholder="Nowy folder…"
          aria-label="Nazwa nowego folderu"
          maxLength={255}
          disabled={isCreatingFolder}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button
          type="submit"
          icon={<FolderPlus size={16} />}
          title="Utwórz folder"
          aria-label="Utwórz folder"
          disabled={isCreatingFolder || !newName.trim()}
        />
      </form>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {folders.length === 0 ? (
        <p className="hotspot-folders__empty">Brak folderów</p>
      ) : (
        <ul className="hotspot-folders__list">
          {folders.map((folder) => (
            <li
              key={folder.id}
              className={`hotspot-folders__item${folder.id === selectedId ? ' hotspot-folders__item--selected' : ''}`}
            >
              {editing?.id === folder.id ? (
                <>
                  <input
                    className="hotspot-folders__name-input"
                    value={editing.name}
                    autoFocus
                    maxLength={255}
                    aria-label="Nazwa folderu"
                    disabled={isRenamingFolder}
                    onChange={(event) => setEditing({ id: folder.id, name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void saveName();
                      if (event.key === 'Escape') setEditing(null);
                    }}
                  />
                  <Button
                    variant="ghost"
                    icon={<Check size={14} />}
                    aria-label="Zapisz nazwę"
                    disabled={isRenamingFolder}
                    onClick={() => void saveName()}
                  />
                  <Button variant="ghost" icon={<X size={14} />} aria-label="Anuluj" onClick={() => setEditing(null)} />
                </>
              ) : (
                <>
                  <button type="button" className="hotspot-folders__select" onClick={() => onSelect(folder.id)}>
                    <Folder size={14} aria-hidden="true" />
                    <span className="hotspot-folders__name">{folder.name}</span>
                    <span className="hotspot-folders__count mono-data">{folder.hotspot_count}</span>
                  </button>
                  <Button
                    variant="ghost"
                    icon={<Pencil size={14} />}
                    title="Zmień nazwę"
                    aria-label={`Zmień nazwę folderu ${folder.name}`}
                    onClick={() => setEditing({ id: folder.id, name: folder.name })}
                  />
                  <Button
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    title="Usuń folder"
                    aria-label={`Usuń folder ${folder.name}`}
                    onClick={() => setDeleting(folder)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal title="Usuń folder" open={deleting !== null} onClose={() => setDeleting(null)}>
        <p>
          Czy na pewno chcesz usunąć folder „{deleting?.name}”? Wszystkie jego hotspoty ({deleting?.hotspot_count ?? 0})
          wraz z anotacjami zostaną trwale usunięte. Tej operacji nie można cofnąć.
        </p>
        <div className="hotspot-form__actions">
          <Button onClick={() => setDeleting(null)} disabled={isDeletingFolder}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeletingFolder}>
            {isDeletingFolder ? 'Usuwanie…' : 'Usuń'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
