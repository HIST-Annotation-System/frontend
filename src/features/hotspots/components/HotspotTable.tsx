import { Check, FolderInput, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge, { type BadgeTone } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Modal from '../../../components/ui/Modal';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFolder, HotspotSort, HotspotStatus } from '../../../types/hotspot';
import type { Tag } from '../../../types/tag';
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

interface HotspotTableProps {
  hotspots: Hotspot[];
  folders: HotspotFolder[];
  /** The catalog's order; that column is emphasised. */
  sort: HotspotSort;
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (hotspotId: string) => void;
  /** Selects every listed hotspot, or clears the selection when all are selected (header checkbox). */
  onToggleAll?: () => void;
}

/** The browse view: one dense row per hotspot with everything known about it, and its management. */
export default function HotspotTable({
  hotspots,
  folders,
  sort,
  linkSearch,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: HotspotTableProps) {
  const { data: allTags = [] } = useTags();
  const selectedCount = hotspots.filter((hotspot) => selectedIds.has(hotspot.id)).length;
  const allSelected = hotspots.length > 0 && selectedCount === hotspots.length;
  const tagSort = TAG_DIMENSIONS.some((dimension) => dimension.value === sort);

  return (
    <div className="hotspot-table__scroll">
      <table className="hotspot-table">
        <thead>
          <tr>
            <th className="hotspot-table__check">
              {onToggleAll && (
                <input
                  type="checkbox"
                  title="Zaznacz widoczne"
                  aria-label="Zaznacz wszystkie widoczne hotspoty"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = selectedCount > 0 && !allSelected;
                  }}
                  onChange={onToggleAll}
                />
              )}
            </th>
            <th>Podgląd</th>
            <th>Nazwa</th>
            <th>Folder</th>
            <th>Źródło</th>
            <th>Rozmiar</th>
            <th className="hotspot-table__number">Anotacje</th>
            {HOTSPOT_FEATURES.map((feature) => (
              <th
                key={feature.value}
                title={feature.description}
                className={`hotspot-table__number${feature.value === sort ? ' hotspot-table__active' : ''}`}
              >
                {feature.shortLabel}
              </th>
            ))}
            <th className={tagSort ? 'hotspot-table__active' : undefined}>Tagi</th>
            <th>Status</th>
            <th className={`hotspot-table__number${sort === 'score' ? ' hotspot-table__active' : ''}`}>Wynik</th>
            <th className={sort === 'created_at' ? 'hotspot-table__active' : undefined}>Utworzono</th>
            <th className="hotspot-table__actions">Akcje</th>
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
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moveRoot = useRef<HTMLDivElement>(null);
  const status = HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot));
  const link = `/hotspots/${hotspot.id}${linkSearch}`;
  const folderName = folders.find((folder) => folder.id === hotspot.folder_id)?.name;
  // Verdicts first, then custom tags.
  const tags = [
    ...TAG_DIMENSIONS.flatMap((dimension) => hotspot.tags.filter((tag) => tag.dimension === dimension.value)),
    ...hotspot.tags.filter((tag) => tag.dimension === null),
  ];

  useEffect(() => {
    if (!isMoveOpen) return undefined;
    const closeOutside = (event: MouseEvent) => {
      if (!moveRoot.current?.contains(event.target as Node)) setIsMoveOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoveOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMoveOpen]);

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
    <tr className={selected ? 'hotspot-table__row--selected' : undefined}>
      <td className="hotspot-table__check">
        <input type="checkbox" checked={selected} aria-label={`Zaznacz hotspot ${hotspot.name}`} onChange={onToggleSelect} />
      </td>
      <td>
        <Link
          to={link}
          className="hotspot-table__thumb"
          title="Otwórz do anotacji"
          aria-label={`Otwórz hotspot ${hotspot.name}`}
        >
          <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
        </Link>
      </td>
      <td className="hotspot-table__name">
        {nameDraft !== null ? (
          <span className="hotspot-table__rename">
            <input
              className="hotspot-table__name-input"
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
            <Button
              variant="ghost"
              icon={<X size={14} />}
              aria-label="Anuluj zmianę nazwy"
              onClick={() => setNameDraft(null)}
            />
          </span>
        ) : (
          <Link to={link} className="hotspot-table__name-link" title={hotspot.name}>
            {hotspot.name}
          </Link>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      </td>
      <td className="hotspot-table__text" title={folderName}>
        {folderName ?? '—'}
      </td>
      <td className="hotspot-table__text" title={hotspot.slide_name ?? undefined}>
        <HotspotSource hotspot={hotspot} />
      </td>
      <td className="mono-data">
        {formatDimensions(hotspot.image_width, hotspot.image_height)}
        {hotspot.mpp ? ` · ${formatLength(hotspot.image_width, hotspot.mpp)}` : ''}
      </td>
      <td className="hotspot-table__number mono-data hotspot-table__strong">{hotspot.annotation_count}</td>
      {HOTSPOT_FEATURES.map((feature) => {
        const value = hotspot.features?.[feature.value];
        return (
          <td key={feature.value} className="hotspot-table__number mono-data">
            {value === undefined ? '—' : value.toFixed(2)}
          </td>
        );
      })}
      <td>
        {tags.length === 0 ? (
          <span className="hotspot-table__none">—</span>
        ) : (
          <span className="hotspot-pills hotspot-table__tags">
            {tags.map((tag) => (
              <span key={tag.id} title={tagLabel(tag)}>
                <Badge tone={tagTone(tag, allTags)}>{tag.name}</Badge>
              </span>
            ))}
          </span>
        )}
      </td>
      <td>{status && <Badge tone={STATUS_TONES[status.value]}>{status.label}</Badge>}</td>
      <td className="hotspot-table__number mono-data hotspot-table__strong">{hotspot.score}</td>
      <td className="mono-data hotspot-table__date">{formatDateTime(hotspot.created_at)}</td>
      <td className="hotspot-table__actions">
        <div className="hotspot-table__action-row">
          <Button
            variant="ghost"
            icon={<Pencil size={14} />}
            title="Zmień nazwę"
            aria-label={`Zmień nazwę hotspotu ${hotspot.name}`}
            onClick={() => setNameDraft(hotspot.name)}
          />
          <div className="hotspot-table__move" ref={moveRoot}>
            <Button
              variant="ghost"
              icon={<FolderInput size={14} />}
              title="Przenieś do folderu"
              aria-label={`Przenieś hotspot ${hotspot.name} do folderu`}
              aria-expanded={isMoveOpen}
              aria-haspopup="true"
              disabled={isUpdating}
              onClick={() => setIsMoveOpen(!isMoveOpen)}
            />
            {isMoveOpen && (
              <div className="hotspot-table__menu" role="menu" aria-label="Przenieś do folderu">
                <span className="hotspot-table__menu-label">Przenieś do folderu</span>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    role="menuitem"
                    className="hotspot-table__menu-item"
                    disabled={folder.id === hotspot.folder_id}
                    onClick={() => {
                      setIsMoveOpen(false);
                      void move(folder.id);
                    }}
                  >
                    <span className="hotspot-table__menu-name">{folder.name}</span>
                    <span className="hotspot-table__menu-count">{folder.hotspot_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className="hotspot-table__delete"
            icon={<Trash2 size={14} />}
            title="Usuń hotspot"
            aria-label={`Usuń hotspot ${hotspot.name}`}
            onClick={() => setIsConfirmingDelete(true)}
          />
        </div>
        <Modal title="Usuń hotspot" open={isConfirmingDelete} onClose={() => setIsConfirmingDelete(false)}>
          <p>
            Czy na pewno chcesz usunąć hotspot „{hotspot.name}”? Obraz oraz wszystkie jego anotacje zostaną trwale
            usunięte. Slajd źródłowy pozostaje bez zmian.
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
      </td>
    </tr>
  );
}
