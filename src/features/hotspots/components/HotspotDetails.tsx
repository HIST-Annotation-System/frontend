import { ArrowRight, Check, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge, { type BadgeTone } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFeature, HotspotFolder, HotspotStatus } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import { useHotspotMutations } from '../hooks/useHotspots';
import { useTags } from '../hooks/useTags';
import { formatLength } from '../utils/hotspotFormat';
import { HOTSPOT_STATUS_OPTIONS, hotspotStatus } from '../utils/hotspotReview';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TAG_DIMENSIONS, tagLabel, tagTone } from '../utils/hotspotTags';
import HotspotSource from './HotspotSource';
import './Hotspots.css';

const STATUS_TONES: Record<HotspotStatus, BadgeTone> = {
  untagged: 'neutral',
  to_reannotate: 'warn',
  reannotated: 'accent',
};

interface HotspotDetailsProps {
  hotspot: Hotspot;
  folders: HotspotFolder[];
  /** The listed hotspots: each feature bar shows where this one sits between their min and max. */
  listed: Hotspot[];
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  /** Rename, move and delete belong to browsing, as in the table. */
  manage: boolean;
  onClose: () => void;
}

/** Everything known about one hotspot, beside the catalog list. */
export default function HotspotDetails({ hotspot, folders, listed, linkSearch, manage, onClose }: HotspotDetailsProps) {
  const { data: allTags = [] } = useTags();
  const { updateHotspot, isUpdating, deleteHotspot, isDeleting } = useHotspotMutations();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = `/hotspots/${hotspot.id}${linkSearch}`;
  const status = HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot));
  const folderName = folders.find((folder) => folder.id === hotspot.folder_id)?.name ?? '—';
  const tags = [
    ...TAG_DIMENSIONS.flatMap((dimension) => hotspot.tags.filter((tag) => tag.dimension === dimension.value)),
    ...hotspot.tags.filter((tag) => tag.dimension === null),
  ];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && nameDraft === null && !isConfirmingDelete) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nameDraft, isConfirmingDelete, onClose]);

  const position = (feature: HotspotFeature): number | null => {
    const value = hotspot.features?.[feature];
    const values = listed.map((item) => item.features?.[feature]).filter((v): v is number => v !== undefined);
    if (value === undefined || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return max === min ? 0.5 : (value - min) / (max - min);
  };

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
      setIsConfirmingDelete(false);
      onClose();
    } catch (requestError) {
      setIsConfirmingDelete(false);
      setError(getErrorMessage(requestError, 'Nie udało się usunąć hotspotu.'));
    }
  };

  return (
    <aside className="hotspot-details" aria-label={`Szczegóły hotspotu ${hotspot.name}`}>
      <header className="hotspot-details__header">
        <span className="label-caps">Szczegóły</span>
        <Button variant="ghost" icon={<X size={16} />} title="Zamknij (Esc)" aria-label="Zamknij szczegóły" onClick={onClose} />
      </header>

      <div className="hotspot-details__body">
        <Link to={link} className="hotspot-details__image" title="Otwórz do anotacji">
          <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" />
        </Link>

        {nameDraft !== null ? (
          <span className="hotspot-details__rename">
            <input
              value={nameDraft}
              autoFocus
              maxLength={255}
              aria-label="Nazwa hotspotu"
              disabled={isUpdating}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveName();
                if (event.key === 'Escape') setNameDraft(null);
              }}
            />
            <Button variant="ghost" icon={<Check size={14} />} aria-label="Zapisz nazwę" onClick={() => void saveName()} />
            <Button variant="ghost" icon={<X size={14} />} aria-label="Anuluj zmianę nazwy" onClick={() => setNameDraft(null)} />
          </span>
        ) : (
          <h2 className="hotspot-details__name" title={hotspot.name}>
            {hotspot.name}
          </h2>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <Link to={link} className="btn btn--primary hotspot-details__open">
          Otwórz do anotacji
          <ArrowRight size={16} aria-hidden="true" />
        </Link>

        <section className="hotspot-details__section">
          <h3 className="label-caps">Ocena eksperta</h3>
          <dl className="hotspot-details__list">
            <div className="hotspot-details__row">
              <dt>Status</dt>
              <dd>{status ? <Badge tone={STATUS_TONES[status.value]}>{status.label}</Badge> : '—'}</dd>
            </div>
            <div className="hotspot-details__row">
              <dt>Tagi</dt>
              <dd>
                {tags.length === 0 ? (
                  '—'
                ) : (
                  <span className="hotspot-pills hotspot-details__tags">
                    {tags.map((tag) => (
                      <span key={tag.id} title={tagLabel(tag)}>
                        <Badge tone={tagTone(tag, allTags)}>{tag.name}</Badge>
                      </span>
                    ))}
                  </span>
                )}
              </dd>
            </div>
            <div className="hotspot-details__row">
              <dt>Wynik</dt>
              <dd className="mono-data">{hotspot.score}</dd>
            </div>
            {hotspot.assessed_by && (
              <div className="hotspot-details__row">
                <dt>Ocenił</dt>
                <dd>{hotspot.assessed_by}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="hotspot-details__section">
          <h3 className="label-caps">Cechy obrazu</h3>
          <ul className="hotspot-details__features">
            {HOTSPOT_FEATURES.map((feature) => {
              const value = hotspot.features?.[feature.value];
              const at = position(feature.value);
              return (
                <li key={feature.value} className="hotspot-details__feature" title={feature.description}>
                  <span className="hotspot-details__feature-label">{feature.label}</span>
                  <span className="hotspot-details__feature-value mono-data">
                    {value === undefined ? '—' : value.toFixed(2)}
                  </span>
                  {at !== null && (
                    <span className="hotspot-details__bar" aria-hidden="true" title="Miejsce między najmniejszą a największą wartością na liście">
                      <span className="hotspot-details__bar-mark" style={{ left: `${at * 100}%` }} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="hotspot-details__section">
          <h3 className="label-caps">Informacje</h3>
          <dl className="hotspot-details__list">
            <div className="hotspot-details__row">
              <dt>Folder</dt>
              <dd>{folderName}</dd>
            </div>
            <div className="hotspot-details__row">
              <dt>Źródło</dt>
              <dd>
                <HotspotSource hotspot={hotspot} />
              </dd>
            </div>
            <div className="hotspot-details__row">
              <dt>Rozmiar</dt>
              <dd className="mono-data">
                {formatDimensions(hotspot.image_width, hotspot.image_height)}
                {hotspot.mpp ? ` · ${formatLength(hotspot.image_width, hotspot.mpp)}` : ''}
              </dd>
            </div>
            <div className="hotspot-details__row">
              <dt>Anotacje</dt>
              <dd className="mono-data">{hotspot.annotation_count}</dd>
            </div>
            <div className="hotspot-details__row">
              <dt>Utworzono</dt>
              <dd className="mono-data">{formatDateTime(hotspot.created_at)}</dd>
            </div>
          </dl>
        </section>

        {manage && (
          <section className="hotspot-details__section hotspot-details__manage">
            <Button icon={<Pencil size={14} />} onClick={() => setNameDraft(hotspot.name)} disabled={nameDraft !== null}>
              Zmień nazwę
            </Button>
            <select
              className="hotspot-sort__select"
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
            <Button className="hotspot-details__delete" icon={<Trash2 size={14} />} onClick={() => setIsConfirmingDelete(true)}>
              Usuń hotspot
            </Button>
          </section>
        )}
      </div>

      <Modal title="Usuń hotspot" open={isConfirmingDelete} onClose={() => setIsConfirmingDelete(false)}>
        <p>
          Czy na pewno chcesz usunąć hotspot „{hotspot.name}”? Obraz oraz wszystkie jego anotacje zostaną trwale usunięte.
          Slajd źródłowy pozostaje bez zmian.
        </p>
        <div className="hotspot-form__actions">
          <Button onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting}>
            Wróć
          </Button>
          <Button variant="primary" onClick={() => void confirmDelete()} disabled={isDeleting}>
            {isDeleting ? 'Usuwanie…' : 'Usuń'}
          </Button>
        </div>
      </Modal>
    </aside>
  );
}
