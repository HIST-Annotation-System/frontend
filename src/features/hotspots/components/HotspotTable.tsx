import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFolder, HotspotSort } from '../../../types/hotspot';
import type { Tag } from '../../../types/tag';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateTime, formatDimensions } from '../../../utils/format';
import { useHotspotMutations } from '../hooks/useHotspots';
import { useTags } from '../hooks/useTags';
import { formatLength } from '../utils/hotspotFormat';
import { HOTSPOT_STATUS_OPTIONS, hotspotStatus } from '../utils/hotspotReview';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TAG_DIMENSIONS, tagTone } from '../utils/hotspotTags';
import HotspotSource from './HotspotSource';
import '../../slides/components/SlideList.css';
import './Hotspots.css';

interface HotspotTableProps {
  hotspots: Hotspot[];
  folders: HotspotFolder[];
  /** The catalog's order; that column is emphasised. */
  sort: HotspotSort;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (hotspotId: string) => void;
}

/** The browse view: one dense row per hotspot with everything known about it, and its management. */
export default function HotspotTable({
  hotspots,
  folders,
  sort,
  linkSearch,
  selectedIds,
  onToggleSelect,
}: HotspotTableProps) {
  const { data: allTags = [] } = useTags();

  return (
    <div className="hotspot-table__scroll">
      <table className="hotspot-table">
        <thead>
          <tr>
            <th aria-label="Zaznaczenie" />
            <th aria-label="Podgląd" />
            <th>Nazwa</th>
            <th>Folder</th>
            <th>Źródło</th>
            <th>Rozmiar</th>
            {HOTSPOT_FEATURES.map((feature) => (
              <th
                key={feature.value}
                title={feature.description}
                className={`hotspot-table__number${feature.value === sort ? ' hotspot-table__active' : ''}`}
              >
                {feature.shortLabel}
              </th>
            ))}
            {TAG_DIMENSIONS.map((dimension) => (
              <th key={dimension.value} className={dimension.value === sort ? 'hotspot-table__active' : undefined}>
                {dimension.label}
              </th>
            ))}
            <th>Tagi</th>
            <th className={`hotspot-table__number${sort === 'score' ? ' hotspot-table__active' : ''}`}>Wynik</th>
            <th>Status</th>
            <th className="hotspot-table__number">Anotacje</th>
            <th className={sort === 'created_at' ? 'hotspot-table__active' : undefined}>Utworzono</th>
            <th aria-label="Akcje" />
          </tr>
        </thead>
        <tbody>
          {hotspots.map((hotspot) => (
            <HotspotRow
              key={hotspot.id}
              hotspot={hotspot}
              folders={folders}
              allTags={allTags}
              linkSearch={linkSearch}
              selected={selectedIds.has(hotspot.id)}
              onToggleSelect={() => onToggleSelect(hotspot.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface HotspotRowProps {
  hotspot: Hotspot;
  folders: HotspotFolder[];
  allTags: Tag[];
  linkSearch: string;
  selected: boolean;
  onToggleSelect: () => void;
}

function HotspotRow({ hotspot, folders, allTags, linkSearch, selected, onToggleSelect }: HotspotRowProps) {
  const { updateHotspot, isUpdating, deleteHotspot, isDeleting } = useHotspotMutations();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot));
  const link = `/hotspots/${hotspot.id}${linkSearch}`;

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

  const badges = (tags: Tag[]) =>
    tags.length === 0
      ? '—'
      : tags.map((tag) => (
          <Badge key={tag.id} tone={tagTone(tag, allTags)}>
            {tag.name}
          </Badge>
        ));

  return (
    <tr className={selected ? 'hotspot-table__row--selected' : undefined}>
      <td>
        <input type="checkbox" checked={selected} aria-label={`Zaznacz hotspot ${hotspot.name}`} onChange={onToggleSelect} />
      </td>
      <td>
        <Link to={link} className="hotspot-table__thumb" aria-label={`Otwórz hotspot ${hotspot.name}`}>
          <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
        </Link>
      </td>
      <td className="hotspot-table__name">
        {nameDraft !== null ? (
          <span className="hotspot-table__rename">
            <input
              className="hotspot-card__move"
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
          <span className="hotspot-table__rename">
            <Link to={link} title={hotspot.name}>
              {hotspot.name}
            </Link>
            <Button
              variant="ghost"
              icon={<Pencil size={12} />}
              title="Zmień nazwę"
              aria-label={`Zmień nazwę hotspotu ${hotspot.name}`}
              onClick={() => setNameDraft(hotspot.name)}
            />
          </span>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      </td>
      <td>
        <select
          className="hotspot-card__move"
          aria-label="Przenieś do folderu"
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
      </td>
      <td className="hotspot-table__text" title={hotspot.slide_name ?? undefined}>
        <HotspotSource hotspot={hotspot} />
      </td>
      <td className="mono-data">
        {formatDimensions(hotspot.image_width, hotspot.image_height)}
        {hotspot.mpp ? ` · ${formatLength(hotspot.image_width, hotspot.mpp)}` : ''}
      </td>
      {HOTSPOT_FEATURES.map((feature) => {
        const value = hotspot.features?.[feature.value];
        return (
          <td key={feature.value} className="hotspot-table__number mono-data">
            {value === undefined ? '—' : value.toFixed(2)}
          </td>
        );
      })}
      {TAG_DIMENSIONS.map((dimension) => (
        <td key={dimension.value}>{badges(hotspot.tags.filter((tag) => tag.dimension === dimension.value))}</td>
      ))}
      <td>
        <span className="hotspot-tags">{badges(hotspot.tags.filter((tag) => tag.dimension === null))}</span>
      </td>
      <td className="hotspot-table__number mono-data">{hotspot.score}</td>
      <td>{status?.label}</td>
      <td className="hotspot-table__number mono-data">{hotspot.annotation_count}</td>
      <td className="mono-data">{formatDateTime(hotspot.created_at)}</td>
      <td>
        <Button
          variant="ghost"
          icon={<Trash2 size={14} />}
          title="Usuń hotspot"
          aria-label={`Usuń hotspot ${hotspot.name}`}
          onClick={() => setIsConfirmingDelete(true)}
        />
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
      </td>
    </tr>
  );
}
