import { useState, type FormEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { apiUrl } from '../../../services/httpClient';
import type { HotspotBatch } from '../../../types/hotspot';
import type { SlideDetail } from '../../../types/slide';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotFolders, useHotspotMutations } from '../hooks/useHotspots';
import { formatSquareSize } from '../utils/hotspotFormat';
import { HOTSPOT_BOX_SIZE, type Box } from '../utils/hotspotBoxes';
import { readLastFolderId, rememberLastFolderId } from '../utils/lastFolder';

const NEW_FOLDER = '__new__';
const DEFAULT_FOLDER_NAME = 'Hotspoty';
const PREVIEW_SIZE = 240;

interface CreateHotspotBatchModalProps {
  slide: SlideDetail;
  /** The chosen boxes (at least one). */
  boxes: Box[];
  onClose: () => void;
  onCreated: (batch: HotspotBatch) => void;
}

/** Where the chosen boxes go and how they are named; confirming starts cutting them out in the background. */
export default function CreateHotspotBatchModal({ slide, boxes, onClose, onCreated }: CreateHotspotBatchModalProps) {
  const { data: folders = [], isPending: isLoadingFolders } = useHotspotFolders();
  const { createFolder, createBatch, isCreatingFolder, isCreatingBatch } = useHotspotMutations();
  // One id per dialog: a retry after a lost response finds the batch it already started.
  const [batchId] = useState(() => crypto.randomUUID());
  const [namePrefix, setNamePrefix] = useState(slide.name);
  const [chosenFolderId, setChosenFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState(DEFAULT_FOLDER_NAME);
  const [error, setError] = useState<string | null>(null);

  // Until the user picks one: the last folder used (if it still exists), else the first, else a new folder.
  const lastFolderId = readLastFolderId();
  const folderId =
    chosenFolderId ??
    (folders.some((folder) => folder.id === lastFolderId) ? lastFolderId : (folders[0]?.id ?? NEW_FOLDER));
  const isSaving = isCreatingFolder || isCreatingBatch;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      let targetFolderId = folderId;
      if (targetFolderId === NEW_FOLDER || targetFolderId === null) {
        targetFolderId = (await createFolder(newFolderName.trim())).id;
        // A retry after a failed request must not create the folder a second time.
        setChosenFolderId(targetFolderId);
      }
      const batch = await createBatch({
        id: batchId,
        slide_id: slide.id,
        folder_id: targetFolderId,
        name_prefix: namePrefix.trim(),
        boxes: boxes.map((box) => [box.x, box.y]),
      });
      rememberLastFolderId(targetFolderId);
      onCreated(batch);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się rozpocząć tworzenia hotspotów.'));
    }
  };

  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const width = Math.max(...boxes.map((box) => box.x)) + HOTSPOT_BOX_SIZE - left;
  const height = Math.max(...boxes.map((box) => box.y)) + HOTSPOT_BOX_SIZE - top;
  const previewUrl = apiUrl(`/slides/${slide.id}/region`, { x: left, y: top, width, height, max_size: PREVIEW_SIZE });

  return (
    <Modal title="Nowe hotspoty" open onClose={onClose}>
      <form className="hotspot-form" onSubmit={(event) => void save(event)}>
        <div className="hotspot-form__layout">
          <img className="hotspot-form__preview" src={previewUrl} alt="Podgląd zaznaczonego obszaru" />
          <div className="hotspot-form__fields">
            <label className="hotspot-form__field">
              <span className="label">Przedrostek nazwy</span>
              <input
                value={namePrefix}
                required
                autoFocus
                maxLength={240}
                onChange={(event) => setNamePrefix(event.target.value)}
              />
            </label>
            <label className="hotspot-form__field">
              <span className="label">Folder</span>
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
                <span className="label">Nazwa nowego folderu</span>
                <input
                  value={newFolderName}
                  required
                  maxLength={255}
                  onChange={(event) => setNewFolderName(event.target.value)}
                />
              </label>
            )}
            <dl className="hotspot-form__meta mono-data">
              <dt>Hotspoty</dt>
              <dd>{boxes.length.toLocaleString('pl-PL')}</dd>
              <dt>Rozmiar</dt>
              <dd>{formatSquareSize(HOTSPOT_BOX_SIZE, slide.mpp_x)}</dd>
              <dt>Nazwy</dt>
              <dd>
                {namePrefix.trim()} ({boxes[0].x}, {boxes[0].y})…
              </dd>
            </dl>
          </div>
        </div>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div className="hotspot-form__actions">
          <Button onClick={onClose} disabled={isSaving}>
            Anuluj
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving || isLoadingFolders}>
            {isSaving ? 'Zapisywanie…' : `Utwórz ${boxes.length.toLocaleString('pl-PL')}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
