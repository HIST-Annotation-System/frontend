import { Check, PanelRightClose, Trash2, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import { getHotspotThumbnailUrl } from '../../../services/hotspotsApi';
import type { Hotspot, HotspotFolder } from '../../../types/hotspot';
import type { Tag } from '../../../types/tag';
import { getErrorMessage } from '../../../utils/errors';
import { formatDateTime, formatDecimal, formatDimensions } from '../../../utils/format';
import { useHotspotMutations } from '../hooks/useHotspots';
import { formatLength } from '../utils/hotspotFormat';
import { HOTSPOT_STATUS_OPTIONS, hotspotStatus } from '../utils/hotspotReview';
import { HOTSPOT_FEATURES } from '../utils/hotspotSort';
import { TAG_DIMENSIONS, tagLabel } from '../utils/hotspotTags';
import HotspotDeleteModal from './HotspotDeleteModal';
import HotspotSource from './HotspotSource';
import './Hotspots.css';

/** Tag names as plain text; the alarming ones (wrong annotation, top importance) in red. */
function TagNames({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return <>—</>;
  return (
    <>
      {tags.map((tag, index) => (
        <span
          key={tag.id}
          title={tagLabel(tag)}
        >
          {index > 0 && ', '}
          {tag.name}
        </span>
      ))}
    </>
  );
}

function PaneStrip({ onCollapse }: { onCollapse: () => void }) {
  return (
    <header className="pane-strip">
      <span>Szczegóły</span>
      <Button
        variant="ghost"
        icon={<PanelRightClose size={16} />}
        title="Zwiń panel"
        aria-label="Zwiń panel szczegółów"
        onClick={onCollapse}
      />
    </header>
  );
}

/** The details panel with no hotspot to show (the list is loading or empty). */
export function HotspotDetailsPlaceholder({ text, onCollapse }: { text: string; onCollapse: () => void }) {
  return (
    <aside className="side-pane hotspot-details" aria-label="Szczegóły hotspotu">
      <PaneStrip onCollapse={onCollapse} />
      <p className="hotspot-details__empty">{text}</p>
    </aside>
  );
}

interface HotspotDetailsProps {
  hotspot: Hotspot;
  folders: HotspotFolder[];
  /** The catalog's URL search, handed to the viewer so it can walk the same list. */
  linkSearch: string;
  /** Rename, move and delete belong to browsing, as in the table. */
  manage: boolean;
  /** Folds the panel away (it stays docked beside the catalog otherwise). */
  onCollapse: () => void;
}

/** Everything known about one hotspot, beside the catalog list. */
export default function HotspotDetails({ hotspot, folders, linkSearch, manage, onCollapse }: HotspotDetailsProps) {
  const { updateHotspot, isUpdating, deleteHotspot, isDeleting } = useHotspotMutations();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = `/hotspots/${hotspot.id}${linkSearch}`;
  const status = HOTSPOT_STATUS_OPTIONS.find((option) => option.value === hotspotStatus(hotspot));
  const folderName = folders.find((folder) => folder.id === hotspot.folder_id)?.name ?? '—';

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
    } catch (requestError) {
      setIsConfirmingDelete(false);
      setError(getErrorMessage(requestError, 'Nie udało się usunąć hotspotu.'));
    }
  };

  return (
    <aside className="side-pane hotspot-details" aria-label={`Szczegóły hotspotu ${hotspot.name}`}>
      <PaneStrip onCollapse={onCollapse} />

      <div className="preview-pane">
        <Link to={link} className="preview-pane__image preview-pane__image--square" title="Otwórz do anotacji">
          <img src={getHotspotThumbnailUrl(hotspot.id)} alt="" />
        </Link>

        {nameDraft !== null ? (
          <span className="hotspot-details__rename">
            <input
              value={nameDraft}
              autoFocus
              maxLength={255}
              aria-label="Nazwa hotspotu (Enter zapisuje, Esc anuluje)"
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
          <h2 className="preview-pane__title">{hotspot.name}</h2>
        )}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <dl className="kv">
          <dt>Źródło</dt>
          <dd title={hotspot.slide_name ?? undefined}>
            <HotspotSource hotspot={hotspot} />
          </dd>
          <dt>Folder</dt>
          <dd title={folderName}>{folderName}</dd>
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
                <dd>{value === undefined ? '—' : formatDecimal(value, 2)}</dd>
              </Fragment>
            );
          })}
          {TAG_DIMENSIONS.map((dimension) => (
            <Fragment key={dimension.value}>
              <dt>{dimension.label}</dt>
              <dd>
                <TagNames tags={hotspot.tags.filter((tag) => tag.dimension === dimension.value)} />
              </dd>
            </Fragment>
          ))}
          <dt>Tagi</dt>
          <dd>
            <TagNames tags={hotspot.tags.filter((tag) => tag.dimension === null)} />
          </dd>
          <dt>Wynik</dt>
          <dd>{hotspot.score}</dd>
          <dt>Stan</dt>
          <dd>{status?.label ?? '—'}</dd>
          {hotspot.assessed_by && (
            <>
              <dt>Ocenił</dt>
              <dd>{hotspot.assessed_by}</dd>
            </>
          )}
          <dt>Anotacje</dt>
          <dd>{hotspot.annotation_count}</dd>
          <dt>Dodano</dt>
          <dd>{formatDateTime(hotspot.created_at)}</dd>
        </dl>

        <div className="preview-pane__actions">
          <Link to={link} className="btn btn--primary">
            Otwórz
          </Link>
          {manage && (
            <>
              <Button onClick={() => setNameDraft(hotspot.name)} disabled={nameDraft !== null}>
                Zmień nazwę
              </Button>
              <span className="hotspot-details__move">
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
                <Button
                  variant="ghost"
                  className="hotspot-details__delete"
                  icon={<Trash2 size={16} />}
                  title="Usuń hotspot"
                  aria-label={`Usuń hotspot ${hotspot.name}`}
                  onClick={() => setIsConfirmingDelete(true)}
                />
              </span>
            </>
          )}
        </div>
      </div>

      <HotspotDeleteModal
        name={hotspot.name}
        open={isConfirmingDelete}
        isDeleting={isDeleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </aside>
  );
}
