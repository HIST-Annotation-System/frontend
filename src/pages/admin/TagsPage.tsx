import { Check, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTagMutations, useTags } from '../../features/hotspots/hooks/useTags';
import {
  CUSTOM_TAG_DEFAULT_WEIGHT,
  customWeightCap,
  maxCustomWeight,
  TAG_DIMENSIONS,
  TAG_WEIGHT_MAX,
} from '../../features/hotspots/utils/hotspotTags';
import type { Tag } from '../../types/tag';
import { getErrorMessage } from '../../utils/errors';
import './CellTypesPage.css';

/** The shared hotspot tags: names, weights (a hotspot's score is the sum), and removal of custom tags. */
export default function TagsPage() {
  const { data: tags = [], isLoading } = useTags();
  const { createTag, isCreating } = useTagMutations();
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(CUSTOM_TAG_DEFAULT_WEIGHT);
  const [apiError, setApiError] = useState<string | null>(null);
  const cap = customWeightCap(tags);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setApiError(null);
    try {
      await createTag({ name, weight: newWeight });
      setNewName('');
    } catch (requestError) {
      setApiError(getErrorMessage(requestError, 'Nie udało się utworzyć tagu.'));
    }
  };

  return (
    <div className="ct-page">
      <div className="page-header">
        <h1 className="page-title">Tagi</h1>
        <p className="page-subtitle">
          Wynik hotspotu to suma wag jego tagów; tryb REANNOTUJ sortuje według niego. Ważność i poprawność można
          tylko przeważyć. Tagi własne muszą ważyć mniej niż najlżejsza niezerowa ocena
          {cap === null ? '' : ` (obecnie < ${cap})`}.
        </p>
      </div>

      {apiError && (
        <div className="ct-api-error" role="alert">
          <span>{apiError}</span>
          <button type="button" className="ct-api-error__dismiss" onClick={() => setApiError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="ct-card">
        <div className="ct-card__header">
          <h2>Tagi</h2>
          <span className="ct-badge">{tags.length}</span>
        </div>

        <form onSubmit={(event) => void create(event)} className="ct-add-form">
          <input
            type="text"
            className="ct-input"
            placeholder="Nazwa nowego tagu…"
            maxLength={64}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            autoComplete="off"
          />
          <input
            type="number"
            className="ct-input tags-page__weight"
            aria-label="Waga nowego tagu"
            min={0}
            max={maxCustomWeight(tags)}
            value={newWeight}
            onChange={(event) => setNewWeight(Number(event.target.value))}
          />
          <button type="submit" className="btn-primary btn-sm" disabled={isCreating || !newName.trim()}>
            <Plus size={15} />
            Dodaj
          </button>
        </form>

        <div className="ct-list-container">
          {isLoading ? (
            <div className="ct-loading">Ładowanie…</div>
          ) : (
            <ul className="ct-list" role="list">
              {tags.map((tag) => (
                <TagRow key={`${tag.id}:${tag.name}:${tag.weight}`} tag={tag} onError={setApiError} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TagRow({ tag, onError }: { tag: Tag; onError: (message: string | null) => void }) {
  const { updateTag, isUpdating, deleteTag, isDeleting } = useTagMutations();
  const [name, setName] = useState(tag.name);
  const [weight, setWeight] = useState(tag.weight);
  const dimension = TAG_DIMENSIONS.find((item) => item.value === tag.dimension);
  const changed = name.trim() !== tag.name || weight !== tag.weight;

  const save = async () => {
    onError(null);
    try {
      await updateTag({
        tagId: tag.id,
        changes: { ...(name.trim() !== tag.name && { name: name.trim() }), ...(weight !== tag.weight && { weight }) },
      });
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się zapisać tagu.'));
    }
  };

  const remove = async () => {
    if (!window.confirm(`Usunąć tag „${tag.name}”? Zniknie ze wszystkich hotspotów.`)) return;
    onError(null);
    try {
      await deleteTag(tag.id);
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się usunąć tagu.'));
    }
  };

  return (
    <li className="ct-item">
      <div className="ct-item__edit-row">
        {dimension && <span className="tags-page__dimension">{dimension.label}</span>}
        <input
          type="text"
          className="ct-input ct-input--inline"
          aria-label="Nazwa tagu"
          maxLength={64}
          value={name}
          disabled={dimension !== undefined}
          title={dimension ? 'Nazw ocen nie można zmieniać.' : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          type="number"
          className="ct-input ct-input--inline tags-page__weight"
          aria-label="Waga tagu"
          min={0}
          max={TAG_WEIGHT_MAX}
          value={weight}
          onChange={(event) => setWeight(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && changed) void save();
          }}
        />
        <button
          type="button"
          className="icon-button success"
          title="Zapisz"
          disabled={!changed || !name.trim() || isUpdating}
          onClick={() => void save()}
        >
          <Check size={15} />
        </button>
        <button
          type="button"
          className="icon-button danger"
          title={dimension ? 'Ocen nie można usuwać.' : 'Usuń'}
          disabled={dimension !== undefined || isDeleting}
          onClick={() => void remove()}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
