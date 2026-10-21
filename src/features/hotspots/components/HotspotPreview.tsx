import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFolder } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import { useHotspotMutations } from '../hooks/useHotspots';
import { useTags } from '../hooks/useTags';
import { formatLength } from '../utils/hotspotFormat';
import { HOTSPOT_STATUS_OPTIONS, hotspotStatus } from '../utils/hotspotReview';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TAG_DIMENSIONS } from '../utils/hotspotTags';
import HotspotSource from './HotspotSource';
import { TagText } from './HotspotTable';
import './Hotspots.css';

interface HotspotPreviewProps {
  hotspot: Hotspot;
  folders: HotspotFolder[];
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
}

/** The browse view's right pane: the selected hotspot's image, everything known about it, and its management. */
export default function HotspotPreview({ hotspot, folders, linkSearch }: HotspotPreviewProps) {
  const { data: allTags = [] } = useTags();
  const { updateHotspot, isUpdating, deleteHotspot, isDeleting } = useHotspotMutations();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot));

  const saveName = async () => {
    const name = nameDraft?.trim();
    if (!name || name === hotspot.name) {
      setNameDraft(null);
      return;
    }
    try {
      await updateHotspot({ hotspotId: hotspot.id, changes: { name } });
      setNameDraft(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się zmienić nazwy hotspotu.'));
    }
  };

  const move = async (folderId: string) => {
    try {
      await updateHotspot({ hotspotId: hotspot.id, changes: { folder_id: folderId } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się przenieść hotspotu.'));
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteHotspot(hotspot.id);
    } catch (requestError) {
      setIsConfirmingDelete(false);
      setError(getErrorMessage(requestError, 'Nie udało się usunąć hotspotu.'));
    }
  };

  return (
    <div className="preview-pane">
      <img className="preview-pane__image preview-pane__image--square" src={getHotspotThumbnailUrl(hotspot.id)} alt="" />
      {nameDraft !== null ? (
        <input
          className="field"
          value={nameDraft}
          autoFocus
          maxLength={255}
          aria-label="Nazwa hotspotu (Enter zapisuje, Esc anuluje)"
          disabled={isUpdating}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void saveName();
            if (event.key === 'Escape') setNameDraft(null);
          }}
        />
      ) : (
        <h2 className="preview-pane__title">{hotspot.name}</h2>
      )}
      <dl className="kv">
        <dt>Źródło</dt>
        <dd title={hotspot.slide_name ?? undefined}>
          <HotspotSource hotspot={hotspot} />
        </dd>
        <dt>Rozmiar</dt>
        <dd>
          {formatDimensions(hotspot.image_width, hotspot.image_height)}
          {hotspot.mpp ? ` · ${formatLength(hotspot.image_width, hotspot.mpp)}` : ''}
        </dd>
        {HOTSPOT_FEATURES.map((feature) => {
          const value = hotspot.features?.[feature.value];
          return (
            <Fragment key={feature.value}>
              <dt title={feature.description}>{feature.shortLabel}</dt>
              <dd>{value === undefined ? '—' : value.toFixed(2)}</dd>
            </Fragment>
          );
        })}
        {TAG_DIMENSIONS.map((dimension) => (
          <Fragment key={dimension.value}>
            <dt>{dimension.label}</dt>
            <dd>
              <TagText tags={hotspot.tags.filter((tag) => tag.dimension === dimension.value)} allTags={allTags} />
            </dd>
          </Fragment>
        ))}
        <dt>Tagi</dt>
        <dd>
          <TagText tags={hotspot.tags.filter((tag) => tag.dimension === null)} allTags={allTags} />
        </dd>
        <dt>Wynik</dt>
        <dd>{hotspot.score}</dd>
        <dt>Stan</dt>
        <dd>{status?.label}</dd>
        <dt>Anotacje</dt>
        <dd>{hotspot.annotation_count}</dd>
        <dt>Utworzono</dt>
        <dd>{formatDateTime(hotspot.created_at)}</dd>
      </dl>
      <div className="preview-pane__actions">
        <Link className="btn btn--primary btn--block" to={`/hotspots/${hotspot.id}${linkSearch}`}>
          Otwórz
        </Link>
        <Button block onClick={() => setNameDraft(hotspot.name)}>
          Zmień nazwę
        </Button>
        <select
          className="field"
          aria-label="Przenieś do folderu"
          value={hotspot.folder_id}
          disabled={isUpdating}
          onChange={(event) => void move(event.target.value)}
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              Folder: {folder.name}
            </option>
          ))}
        </select>
        <Button block variant="danger" onClick={() => setIsConfirmingDelete(true)}>
          Usuń hotspot…
        </Button>
      </div>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      <Modal title="Usuń hotspot" open={isConfirmingDelete} onClose={() => setIsConfirmingDelete(false)}>
        <p>
          Czy na pewno chcesz usunąć hotspot „{hotspot.name}”? Obraz oraz wszystkie jego anotacje zostaną trwale
          usunięte. Slajd źródłowy pozostaje bez zmian.
        </p>
        <div className="modal-actions">
          <Button onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeleting}>
            {isDeleting ? 'Usuwanie…' : 'Usuń hotspot'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
