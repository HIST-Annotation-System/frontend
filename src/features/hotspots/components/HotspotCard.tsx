import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFolder, HotspotSort } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotMutations } from '../hooks/useHotspots';
import { formatDimensions } from '../../../utils/format';
import { formatLength } from '../utils/hotspotFormat';
import { formatSortValue, HOTSPOT_SORT_OPTIONS } from '../utils/hotspotSort';
import HotspotSource from './HotspotSource';
import '../../slides/components/SlideList.css';
import './Hotspots.css';

interface HotspotCardProps {
  hotspot: Hotspot;
  folders: HotspotFolder[];
  /** The catalog's order; a feature's value is shown on the card. */
  sort: HotspotSort;
}

export default function HotspotCard({ hotspot, folders, sort }: HotspotCardProps) {
  const { updateHotspot, isUpdating, deleteHotspot, isDeleting } = useHotspotMutations();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const physicalSize = hotspot.mpp ? ` · ${formatLength(hotspot.image_width, hotspot.mpp)}` : '';
  const sortValue = formatSortValue(hotspot, sort);
  const sortLabel = HOTSPOT_SORT_OPTIONS.find((option) => option.value === sort)?.label;

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
    <div className="slide-card">
      <Link to={`/hotspots/${hotspot.id}`} className="slide-card__thumbnail" aria-label={`Otwórz hotspot ${hotspot.name}`}>
        <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
      </Link>
      <div className="slide-card__body">
        <div className="slide-card__title-row">
          {nameDraft !== null ? (
            <input
              className="slide-card__name-input"
              value={nameDraft}
              autoFocus
              maxLength={255}
              disabled={isUpdating}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveName();
                if (event.key === 'Escape') setNameDraft(null);
              }}
              onBlur={() => void saveName()}
            />
          ) : (
            <span className="slide-card__name" title={hotspot.name}>
              {hotspot.name}
            </span>
          )}
          <div className="slide-card__actions">
            {nameDraft !== null ? (
              <>
                <Button
                  variant="ghost"
                  icon={<Check size={14} />}
                  aria-label="Zapisz nazwę"
                  disabled={isUpdating}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void saveName()}
                />
                <Button
                  variant="ghost"
                  icon={<X size={14} />}
                  aria-label="Anuluj zmianę nazwy"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setNameDraft(null)}
                />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  icon={<Pencil size={14} />}
                  title="Zmień nazwę"
                  aria-label={`Zmień nazwę hotspotu ${hotspot.name}`}
                  onClick={() => setNameDraft(hotspot.name)}
                />
                <Button
                  variant="ghost"
                  icon={<Trash2 size={14} />}
                  title="Usuń hotspot"
                  aria-label={`Usuń hotspot ${hotspot.name}`}
                  onClick={() => setIsConfirmingDelete(true)}
                />
              </>
            )}
          </div>
        </div>
        <span className="slide-card__meta" title={hotspot.slide_name ?? undefined}>
          <HotspotSource hotspot={hotspot} />
        </span>
        <span className="slide-card__meta">
          {formatDimensions(hotspot.image_width, hotspot.image_height)}
          {physicalSize}
        </span>
        {sortValue !== null && (
          <span className="slide-card__meta">
            {sortLabel}: <span className="mono-data">{sortValue}</span>
          </span>
        )}
        <select
          className="hotspot-card__move"
          aria-label="Przenieś do folderu"
          title="Przenieś do folderu"
          value={hotspot.folder_id}
          disabled={isUpdating}
          onChange={(event) => void move(event.target.value)}
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      </div>

      <Modal title="Usuń hotspot" open={isConfirmingDelete} onClose={() => setIsConfirmingDelete(false)}>
        <p>
          Czy na pewno chcesz usunąć hotspot „{hotspot.name}”? Obraz oraz wszystkie jego anotacje zostaną trwale
          usunięte. Slajd źródłowy pozostaje bez zmian.
        </p>
        <div className="slide-card__confirm-actions">
          <Button onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeleting}>
            {isDeleting ? 'Usuwanie…' : 'Usuń'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
