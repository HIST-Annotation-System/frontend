import { Check, CornerDownLeft, Folder, FolderOpen, FolderPlus, Folders, FolderX, Pencil, Trash2, X } from 'lucide-react';
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

/** The catalog's folders: pick one (or all of them) to browse, add, rename or delete (with its hotspots). */
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
      <div className="hotspot-folders__scroll">
        {folders.length === 0 ? (
          <div className="hotspot-folders__empty">
            <FolderX size={20} aria-hidden="true" />
            <span className="hotspot-folders__empty-title">Brak folderów</span>
            <span>Utwórz folder poniżej albo zaznacz hotspoty na slajdzie.</span>
          </div>
        ) : (
          <ul className="hotspot-folders__list">
            <li
              className={`hotspot-folders__item hotspot-folders__item--all${selectedId === ALL_FOLDERS ? ' hotspot-folders__item--selected' : ''}`}
            >
              <button type="button" className="hotspot-folders__select" onClick={() => onSelect(ALL_FOLDERS)}>
                <Folders size={16} aria-hidden="true" />
                <span className="hotspot-folders__name">Wszystkie foldery</span>
                <span className="hotspot-folders__count">
                  {folders.reduce((total, folder) => total + folder.hotspot_count, 0)}
                </span>
              </button>
            </li>
            {folders.map((folder) => {
              const selected = folder.id === selectedId;
              return (
                <li
                  key={folder.id}
                  className={`hotspot-folders__item${selected ? ' hotspot-folders__item--selected' : ''}${editing?.id === folder.id ? ' hotspot-folders__item--editing' : ''}`}
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
                        variant="primary"
                        className="hotspot-folders__save"
                        icon={<Check size={14} />}
                        title="Zapisz"
                        aria-label="Zapisz nazwę"
                        disabled={isRenamingFolder}
                        onClick={() => void saveName()}
                      />
                      <Button
                        variant="ghost"
                        icon={<X size={14} />}
                        title="Anuluj"
                        aria-label="Anuluj"
                        onClick={() => setEditing(null)}
                      />
                    </>
                  ) : (
                    <>
                      <button type="button" className="hotspot-folders__select" onClick={() => onSelect(folder.id)}>
                        {selected ? <FolderOpen size={16} aria-hidden="true" /> : <Folder size={16} aria-hidden="true" />}
                        <span className="hotspot-folders__name">{folder.name}</span>
                        <span className="hotspot-folders__count">{folder.hotspot_count}</span>
                      </button>
                      <Button
                        variant="ghost"
                        icon={<Pencil size={13} />}
                        title="Zmień nazwę"
                        aria-label={`Zmień nazwę folderu ${folder.name}`}
                        onClick={() => setEditing({ id: folder.id, name: folder.name })}
                      />
                      <Button
                        variant="ghost"
                        className="hotspot-folders__delete"
                        icon={<Trash2 size={13} />}
                        title="Usuń folder"
                        aria-label={`Usuń folder ${folder.name}`}
                        onClick={() => setDeleting(folder)}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className="hotspot-folders__new" onSubmit={(event) => void add(event)}>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div className="hotspot-folders__new-field">
          <FolderPlus size={16} className="hotspot-folders__new-icon" aria-hidden="true" />
          <input
            value={newName}
            placeholder="Nowy folder…"
            aria-label="Nazwa nowego folderu"
            maxLength={255}
            disabled={isCreatingFolder}
            onChange={(event) => setNewName(event.target.value)}
          />
          {newName.trim() && (
            <Button
              type="submit"
              variant="primary"
              className="hotspot-folders__create"
              icon={<CornerDownLeft size={13} />}
              title="Utwórz (Enter)"
              aria-label="Utwórz folder"
              disabled={isCreatingFolder}
            />
          )}
        </div>
      </form>

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
