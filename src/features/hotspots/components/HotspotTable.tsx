import { Check, FolderInput, Pencil, Trash2, X } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFeature, HotspotFolder, HotspotSort } from '../../../types/hotspot';
import type { Tag } from '../../../types/tag';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateTime, formatDecimal } from '../../../utils/format';
import { useDismiss } from '../../../hooks/useDismiss';
import { useHotspotMutations } from '../hooks/useHotspots';
import { useTags } from '../hooks/useTags';
import { HOTSPOT_STATUS_OPTIONS, hotspotStatus } from '../utils/hotspotReview';
import { isRowControl } from '../utils/rowClick';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TAG_DIMENSIONS } from '../utils/hotspotTags';
import HotspotDeleteModal from './HotspotDeleteModal';
import { CustomTagPills, VerdictMark } from './TagMarks';
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
  /** Selects every listed hotspot, or clears the selection when all are selected (header checkbox). */
  onToggleAll?: () => void;
  /** The folder column only helps when several folders are listed. */
  showFolder?: boolean;
  /** The hotspot shown in the details panel; its row is highlighted. */
  detailId?: string | null;
  onShowDetails?: (hotspotId: string) => void;
}

/**
 * The browse view: the essentials of each hotspot and its management. The name opens the hotspot for annotation;
 * a click anywhere else on the row (or Enter) shows it in the details panel.
 */
export default function HotspotTable({
  hotspots,
  folders,
  sort,
  linkSearch,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  showFolder = true,
  detailId = null,
  onShowDetails,
}: HotspotTableProps) {
  const selectedCount = hotspots.filter((hotspot) => selectedIds.has(hotspot.id)).length;
  const allSelected = hotspots.length > 0 && selectedCount === hotspots.length;
  const { data: allTags = [] } = useTags();
  // Sorting by an image feature shows that one feature, so the order can be read.
  const sortFeature = HOTSPOT_FEATURES.find((feature) => feature.value === sort) ?? null;

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
            <th className="hotspot-table__thumb-head">
              <span className="visually-hidden">Podgląd</span>
            </th>
            <th>Nazwa</th>
            {sortFeature && (
              <th title={sortFeature.description} className="hotspot-table__number hotspot-table__active">
                {sortFeature.shortLabel}
              </th>
            )}
            {showFolder && <th>Folder</th>}
            {/* Priority and accuracy get a column each, as symbols; the custom tags have their own. */}
            {TAG_DIMENSIONS.map((dimension) => (
              <th
                key={dimension.value}
                className={`hotspot-table__verdict${sort === dimension.value ? ' hotspot-table__active' : ''}`}
              >
                {dimension.label}
              </th>
            ))}
            <th>Tagi</th>
            <th>Stan</th>
            <th className="hotspot-table__number">Anotacje</th>
            <th className={`hotspot-table__number${sort === 'score' ? ' hotspot-table__active' : ''}`}>Wynik</th>
            <th className={`hotspot-table__date${sort === 'created_at' ? ' hotspot-table__active' : ''}`}>Dodano</th>
            <th className="hotspot-table__actions">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {hotspots.map((hotspot) => (
            <HotspotRow
              key={hotspot.id}
              hotspot={hotspot}
              folders={folders}
              linkSearch={linkSearch}
              selected={selectedIds.has(hotspot.id)}
              onToggleSelect={() => onToggleSelect(hotspot.id)}
              sortFeature={sortFeature?.value ?? null}
              allTags={allTags}
              showFolder={showFolder}
              detailsOpen={detailId === hotspot.id}
              onShowDetails={onShowDetails ? () => onShowDetails(hotspot.id) : undefined}
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
  linkSearch: string;
  selected: boolean;
  onToggleSelect: () => void;
  sortFeature: HotspotFeature | null;
  /** Every tag, to place a priority among its values. */
  allTags: Tag[];
  showFolder: boolean;
  detailsOpen: boolean;
  onShowDetails?: () => void;
}

function HotspotRow({
  hotspot,
  folders,
  linkSearch,
  selected,
  onToggleSelect,
  sortFeature,
  allTags,
  showFolder,
  detailsOpen,
  onShowDetails,
}: HotspotRowProps) {
  const { updateHotspot, isUpdating, deleteHotspot, isDeleting } = useHotspotMutations();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moveRoot = useRef<HTMLDivElement>(null);
  const status = HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot));
  const link = `/hotspots/${hotspot.id}${linkSearch}`;
  const folderName = folders.find((folder) => folder.id === hotspot.folder_id)?.name;
  const customTags = hotspot.tags.filter((tag) => tag.dimension === null);

  useDismiss(isMoveOpen, moveRoot, () => setIsMoveOpen(false));

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

  const showDetails = (event: MouseEvent<HTMLElement>) => {
    if (onShowDetails && !isRowControl(event)) onShowDetails();
  };

  // Enter shows the focused row; the arrows move to the next/previous row and show it.
  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter') onShowDetails?.();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const row = (
        event.key === 'ArrowDown' ? event.currentTarget.nextElementSibling : event.currentTarget.previousElementSibling
      ) as HTMLElement | null;
      if (!row) return;
      event.preventDefault();
      row.focus();
      row.click();
    }
  };

  return (
    <tr
      className={
        [selected ? 'hotspot-table__row--selected' : '', detailsOpen ? 'hotspot-table__row--details' : '']
          .filter(Boolean)
          .join(' ') || undefined
      }
      tabIndex={onShowDetails ? 0 : undefined}
      aria-selected={onShowDetails ? detailsOpen : undefined}
      onClick={showDetails}
      onKeyDown={onRowKeyDown}
    >
      <td className="hotspot-table__check">
        <input type="checkbox" checked={selected} aria-label={`Zaznacz hotspot ${hotspot.name}`} onChange={onToggleSelect} />
      </td>
      <td>
        <span className="hotspot-table__thumb">
          <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" loading="lazy" />
        </span>
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
          <Link to={link} className="hotspot-table__name-link" title={`Otwórz do anotacji: ${hotspot.name}`}>
            {hotspot.name}
          </Link>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      </td>
      {sortFeature && (
        <td className="hotspot-table__number mono-data hotspot-table__strong">
          {hotspot.features?.[sortFeature] === undefined ? '—' : formatDecimal(hotspot.features[sortFeature], 2)}
        </td>
      )}
      {showFolder && (
        <td className="hotspot-table__text" title={folderName}>
          {folderName ?? '—'}
        </td>
      )}
      {TAG_DIMENSIONS.map((dimension) => {
        const tag = hotspot.tags.find((item) => item.dimension === dimension.value);
        return (
          <td key={dimension.value} className="hotspot-table__verdict">
            {tag ? <VerdictMark tag={tag} allTags={allTags} /> : <span className="hotspot-table__none">—</span>}
          </td>
        );
      })}
      <td>
        {customTags.length === 0 ? (
          <span className="hotspot-table__none">—</span>
        ) : (
          // One line: two tags, then "+N" for the rest.
          <span className="hotspot-table__tags">
            <CustomTagPills tags={customTags} max={2} />
          </span>
        )}
      </td>
      <td className="hotspot-table__status">{status?.label}</td>
      <td className="hotspot-table__number mono-data">{hotspot.annotation_count}</td>
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
            className="btn--danger-icon"
            icon={<Trash2 size={14} />}
            title="Usuń hotspot"
            aria-label={`Usuń hotspot ${hotspot.name}`}
            onClick={() => setIsConfirmingDelete(true)}
          />
        </div>
        <HotspotDeleteModal
          name={hotspot.name}
          open={isConfirmingDelete}
          isDeleting={isDeleting}
          onConfirm={() => void confirmDelete()}
          onClose={() => setIsConfirmingDelete(false)}
        />
      </td>
    </tr>
  );
}
