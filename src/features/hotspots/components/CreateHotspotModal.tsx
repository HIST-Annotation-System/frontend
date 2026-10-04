import { useState, type FormEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { apiUrl } from '../../../services/httpClient';
import type { Hotspot } from '../../../types/hotspot';
import type { SlideDetail } from '../../../types/slide';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotFolders, useHotspotMutations } from '../hooks/useHotspots';
import { formatSquareSize } from '../utils/hotspotFormat';
import type { SlideSquare } from '../utils/hotspotSquare';
import { readLastFolderId, rememberLastFolderId } from '../utils/lastFolder';

const NEW_FOLDER = '__new__';
const DEFAULT_FOLDER_NAME = 'Hotspoty';
const PREVIEW_SIZE = 240;

interface CreateHotspotModalProps {
  slide: SlideDetail;
  square: SlideSquare;
  onClose: () => void;
  onCreated: (hotspot: Hotspot) => void;
}

export default function CreateHotspotModal({ slide, square, onClose, onCreated }: CreateHotspotModalProps) {
  const { data: folders = [], isPending: isLoadingFolders } = useHotspotFolders();
  const { createFolder, createHotspot, isCreatingFolder, isCreating } = useHotspotMutations();
  const [name, setName] = useState(`${slide.name} (${square.x}, ${square.y})`);
  const [chosenFolderId, setChosenFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState(DEFAULT_FOLDER_NAME);
  const [error, setError] = useState<string | null>(null);

  // Until the user picks one: the last folder used (if it still exists), else the first, else a new folder.
  const lastFolderId = readLastFolderId();
  const folderId =
    chosenFolderId ??
    (folders.some((folder) => folder.id === lastFolderId) ? lastFolderId : (folders[0]?.id ?? NEW_FOLDER));
  const isSaving = isCreatingFolder || isCreating;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      let targetFolderId = folderId;
      if (targetFolderId === NEW_FOLDER || targetFolderId === null) {
        targetFolderId = (await createFolder(newFolderName.trim())).id;
        // A retry after a failed hotspot save must not create the folder a second time.
        setChosenFolderId(targetFolderId);
      }
      const hotspot = await createHotspot({ slide_id: slide.id, folder_id: targetFolderId, name: name.trim(), ...square });
      rememberLastFolderId(targetFolderId);
      onCreated(hotspot);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się zapisać hotspotu.'));
    }
  };

  const previewUrl = apiUrl(`/slides/${slide.id}/region`, {
    x: square.x,
    y: square.y,
    width: square.size,
    height: square.size,
    max_size: PREVIEW_SIZE,
  });

  return (
    <Modal title="Nowy hotspot" open onClose={onClose}>
      <form className="hotspot-form" onSubmit={(event) => void save(event)}>
        <div className="hotspot-form__layout">
          <img className="hotspot-form__preview" src={previewUrl} alt="Podgląd hotspotu" width={PREVIEW_SIZE} height={PREVIEW_SIZE} />
          <div className="hotspot-form__fields">
            <label className="hotspot-form__field">
              <span className="label-caps">Nazwa</span>
              <input value={name} required autoFocus maxLength={255} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="hotspot-form__field">
              <span className="label-caps">Folder</span>
              <select
                value={folderId ?? NEW_FOLDER}
                disabled={isLoadingFolders}
                onChange={(event) => setChosenFolderId(event.target.value)}
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} ({folder.hotspot_count})
                  </option>
                ))}
                <option value={NEW_FOLDER}>+ Nowy folder…</option>
              </select>
            </label>
            {folderId === NEW_FOLDER && (
              <label className="hotspot-form__field">
                <span className="label-caps">Nazwa nowego folderu</span>
                <input
                  value={newFolderName}
                  required
                  maxLength={255}
                  onChange={(event) => setNewFolderName(event.target.value)}
                />
              </label>
            )}
            <dl className="hotspot-form__meta mono-data">
              <dt>Pozycja</dt>
              <dd>
                {square.x.toLocaleString('pl-PL')}, {square.y.toLocaleString('pl-PL')}
              </dd>
              <dt>Rozmiar</dt>
              <dd>{formatSquareSize(square.size, slide.mpp_x)}</dd>
            </dl>
          </div>
        </div>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div className="hotspot-form__actions">
          <Button onClick={onClose} disabled={isSaving}>
            Anuluj
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving || isLoadingFolders}>
            {isSaving ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
