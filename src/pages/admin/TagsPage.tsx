import { Pencil, Trash2 } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { TagPill, VerdictMark } from '../../features/hotspots/components/TagMarks';
import { useTagMutations, useTags } from '../../features/hotspots/hooks/useTags';
import {
  CUSTOM_TAG_DEFAULT_WEIGHT,
  customWeightCap,
  maxCustomWeight,
  TAG_DIMENSIONS,
  TAG_WEIGHT_MAX,
  tagErrorMessage,
} from '../../features/hotspots/utils/hotspotTags';
import type { Tag } from '../../types/tag';
import { getErrorMessage } from '../../utils/errors';
import AdminAlert from './AdminAlert';
import './TagsPage.css';

/** The shared hotspot tags: names, weights (a hotspot's score is the sum), and removal of custom tags. */
export default function TagsPage() {
  const { data: tags = [], isLoading } = useTags();
  const { createTag, isCreating } = useTagMutations();
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(CUSTOM_TAG_DEFAULT_WEIGHT);
  const [apiError, setApiError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const cap = customWeightCap(tags);
  // Display order only: the core ratings by dimension (Priorytet, Poprawność), then tags created by experts.
  const groups = [
    ...TAG_DIMENSIONS.map((dimension) => ({
      label: dimension.label,
      tags: tags.filter((tag) => tag.dimension === dimension.value),
    })),
    { label: 'Własne', tags: tags.filter((tag) => !TAG_DIMENSIONS.some((item) => item.value === tag.dimension)) },
  ];

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setApiError(null);
    try {
      await createTag({ name, weight: newWeight });
      setNewName('');
    } catch (requestError) {
      setApiError(tagErrorMessage(requestError, 'Nie udało się utworzyć tagu.'));
    }
  };

  return (
    <div className="admin-page tags-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Tagi hotspotów
          <span className="admin-page-count">{tags.length}</span>
        </h1>
      </div>

      <form onSubmit={(event) => void create(event)} className="admin-add">
        <label className="admin-field">
          <span className="admin-field__label">Nowy tag</span>
          <input
            type="text"
            className="admin-input"
            maxLength={64}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="admin-field">
          <span className="admin-field__label">Waga</span>
          <input
            type="number"
            className="admin-input admin-input--weight"
            title={`Wynik hotspotu to suma wag jego tagów. Tag własny musi ważyć mniej niż najlżejsza niezerowa ocena${cap === null ? '' : ` (obecnie < ${cap})`}.`}
            min={0}
            max={maxCustomWeight(tags)}
            value={newWeight}
            onChange={(event) => setNewWeight(Number(event.target.value))}
          />
        </label>
        <Button type="submit" variant="primary" disabled={isCreating || !newName.trim()}>
          Dodaj
        </Button>
      </form>

      {apiError && <AdminAlert message={apiError} onDismiss={() => setApiError(null)} />}

      {isLoading ? (
        <div className="admin-loading">Ładowanie…</div>
      ) : (
        <table className="admin-table admin-table--760 admin-table--editable tags-table">
          <thead>
            <tr>
              <th>Rodzaj</th>
              <th>Nazwa</th>
              <th className="admin-table__num">Waga</th>
              <th className="admin-table__actions" aria-label="Akcje" />
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) =>
              group.tags.map((tag, index) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  kind={index === 0 ? group.label : ''}
                  isEditing={editingId === tag.id}
                  onStartEdit={() => {
                    setApiError(null);
                    setEditingId(tag.id);
                  }}
                  onEndEdit={() => setEditingId(null)}
                  onError={setApiError}
                />
              )),
            )}
            {tags.length === 0 && (
              <tr className="admin-table__empty">
                <td colSpan={4}>Brak tagów.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface TagRowProps {
  tag: Tag;
  /** The group label, shown only on the first row of its group. */
  kind: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onError: (message: string | null) => void;
}

/**
 * One tag. The pencil edits a custom tag's name and weight together; a core rating keeps its name, so its pencil
 * edits only the weight, and it cannot be deleted.
 */
function TagRow({ tag, kind, isEditing, onStartEdit, onEndEdit, onError }: TagRowProps) {
  const { updateTag, isUpdating, deleteTag, isDeleting } = useTagMutations();
  const { data: allTags = [] } = useTags();
  const [name, setName] = useState(tag.name);
  const [weight, setWeight] = useState(tag.weight);
  const dimension = TAG_DIMENSIONS.find((item) => item.value === tag.dimension);
  const changed = name.trim() !== tag.name || weight !== tag.weight;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    if (!changed) {
      onEndEdit();
      return;
    }
    onError(null);
    try {
      await updateTag({
        tagId: tag.id,
        changes: { ...(name.trim() !== tag.name && { name: name.trim() }), ...(weight !== tag.weight && { weight }) },
      });
      onEndEdit();
    } catch (requestError) {
      onError(tagErrorMessage(requestError, 'Nie udało się zapisać tagu.'));
    }
  };

  const remove = async () => {
    onError(null);
    try {
      await deleteTag(tag.id);
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się usunąć tagu.'));
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  const startEdit = () => {
    setName(tag.name);
    setWeight(tag.weight);
    onStartEdit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') void save();
    if (event.key === 'Escape') onEndEdit();
  };

  if (isEditing) {
    return (
      <tr>
        <td className="admin-table__muted tags-kind">{kind}</td>
        <td className="tags-name">
          {dimension ? (
            <span title="Nazw ocen nie można zmieniać.">{tag.name}</span>
          ) : (
            <input
              type="text"
              className="admin-edit-input"
              aria-label="Nazwa tagu"
              maxLength={64}
              value={name}
              autoFocus
              disabled={isUpdating}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={onKeyDown}
            />
          )}
        </td>
        <td className="admin-table__num">
          <input
            type="number"
            className="admin-edit-input admin-edit-input--num"
            aria-label="Waga tagu"
            min={0}
            max={TAG_WEIGHT_MAX}
            value={weight}
            autoFocus={dimension !== undefined}
            disabled={isUpdating}
            onChange={(event) => setWeight(Number(event.target.value))}
            onKeyDown={onKeyDown}
          />
        </td>
        <td className="admin-table__actions">
          <span className="admin-row-actions">
            <Button variant="primary" disabled={!name.trim() || isUpdating} onClick={() => void save()}>
              Zapisz
            </Button>
            <Button onClick={onEndEdit}>Anuluj</Button>
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="admin-table__muted tags-kind">{kind}</td>
      <td className="admin-table__truncate tags-name" title={tag.name}>
        {dimension ? <VerdictMark tag={tag} allTags={allTags} labelled /> : <TagPill tag={tag} />}
      </td>
      <td className="admin-table__num">{tag.weight}</td>
      <td className="admin-table__actions">
        <span className="admin-row-actions">
          <button
            type="button"
            className="admin-icon-btn"
            title={dimension ? 'Zmień wagę' : 'Zmień nazwę'}
            aria-label={dimension ? 'Zmień wagę' : 'Zmień nazwę'}
            onClick={startEdit}
          >
            <Pencil size={13} />
          </button>
          {dimension ? (
            <span className="admin-icon-btn admin-icon-btn--placeholder" aria-hidden="true" />
          ) : (
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              title="Usuń tag"
              aria-label="Usuń tag"
              disabled={isDeleting}
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </span>
        <ConfirmDialog
          title="Usuń tag"
          open={isConfirmingDelete}
          confirmLabel="Usuń"
          busy={isDeleting}
          onConfirm={() => void remove()}
          onCancel={() => setIsConfirmingDelete(false)}
        >
          Usunąć tag „{tag.name}”? Zniknie ze wszystkich hotspotów.
        </ConfirmDialog>
      </td>
    </tr>
  );
}
