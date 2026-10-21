import { Calculator, Check, CircleAlert, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { useState, type FormEvent } from 'react';
import { useTagMutations, useTags } from '../../features/hotspots/hooks/useTags';
import {
  CUSTOM_TAG_DEFAULT_WEIGHT,
  customWeightCap,
  maxCustomWeight,
  dimensionTags,
  TAG_DIMENSIONS,
  TAG_WEIGHT_MAX,
  tagTone,
} from '../../features/hotspots/utils/hotspotTags';
import type { Tag } from '../../types/tag';
import { getErrorMessage } from '../../utils/errors';
import './TagsPage.css';

/** The shared hotspot tags: names, weights (a hotspot's score is the sum), and removal of custom tags. */
export default function TagsPage() {
  const { data: tags = [], isLoading } = useTags();
  const { createTag, isCreating } = useTagMutations();
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(CUSTOM_TAG_DEFAULT_WEIGHT);
  const [apiError, setApiError] = useState<string | null>(null);
  const cap = customWeightCap(tags);
  // Display split only: core ratings (with a dimension) vs. tags created by experts.
  const baseTags = tags.filter((tag) => TAG_DIMENSIONS.some((item) => item.value === tag.dimension));
  const customTags = tags.filter((tag) => !TAG_DIMENSIONS.some((item) => item.value === tag.dimension));
  // Worked example of the score: heaviest value of each dimension plus the first custom tag.
  const exampleTags = [
    ...TAG_DIMENSIONS.map((dimension) => dimensionTags(tags, dimension.value)[0]),
    customTags[0],
  ].filter((tag): tag is Tag => tag !== undefined);
  const example = `${exampleTags.map((tag) => `${tag.name} ${tag.weight}`).join(' + ')} = ${exampleTags.reduce(
    (sum, tag) => sum + tag.weight,
    0,
  )}`;

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
    <div className="admin-page tags-page">
      <div className="admin-page-header">
        <div className="admin-page-header__text">
          <h1 className="page-title">Tagi hotspotów</h1>
          <p className="page-subtitle">
            Wynik hotspotu to suma wag jego tagów; tryb „Reannotuj” sortuje według niego. Ważność i poprawność można
            tylko przeważyć. Tagi własne muszą ważyć mniej niż najlżejsza niezerowa ocena
            {cap === null ? '' : ` (obecnie < ${cap})`}.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="admin-alert admin-card--narrow" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{apiError}</span>
          <button type="button" className="admin-alert__dismiss" title="Zamknij" onClick={() => setApiError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {exampleTags.length > 1 && (
        <div className="tags-example admin-card--narrow">
          <Calculator size={16} className="tags-example__icon" aria-hidden="true" />
          <span>
            Przykład: <span className="tags-example__formula">{example}</span>
          </span>
        </div>
      )}

      {baseTags.length > 0 && (
        <div className="admin-card admin-card--narrow">
          <div className="tags-card__header">
            <h2 className="admin-card__title">Oceny podstawowe</h2>
            <span className="admin-card__note">
              <Lock size={12} aria-hidden="true" />
              Nazw ocen nie można zmieniać. Ocen nie można usuwać. Zmienić można tylko wagę.
            </span>
          </div>
          {TAG_DIMENSIONS.map((dimension) => {
            const groupTags = baseTags.filter((tag) => tag.dimension === dimension.value);
            if (groupTags.length === 0) return null;
            return (
              <div key={dimension.value} className="tags-group">
                <span className="tags-group__label label-caps">{dimension.label}</span>
                <ul className="tags-list" role="list">
                  {groupTags.map((tag) => (
                    <TagRow key={`${tag.id}:${tag.name}:${tag.weight}`} tag={tag} allTags={tags} onError={setApiError} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="admin-card admin-card--narrow">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Tagi własne ekspertów</h2>
          <span className="admin-card__count">{customTags.length}</span>
        </div>

        <form onSubmit={(event) => void create(event)} className="admin-add-form">
          <input
            type="text"
            className="admin-input"
            placeholder="Nazwa nowego tagu…"
            maxLength={64}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            autoComplete="off"
          />
          <label className="tags-weight">
            <span className="tags-weight__label">waga</span>
            <input
              type="number"
              className="admin-input admin-input--weight"
              aria-label="Waga nowego tagu"
              min={0}
              max={maxCustomWeight(tags)}
              value={newWeight}
              onChange={(event) => setNewWeight(Number(event.target.value))}
            />
          </label>
          <button type="submit" className="btn-primary btn-sm" disabled={isCreating || !newName.trim()}>
            <Plus size={14} />
            Dodaj
          </button>
        </form>

        {isLoading ? (
          <div className="admin-loading">Ładowanie…</div>
        ) : (
          <ul className="tags-list" role="list">
            {customTags.map((tag) => (
              <TagRow key={`${tag.id}:${tag.name}:${tag.weight}`} tag={tag} allTags={tags} onError={setApiError} />
            ))}
            {customTags.length === 0 && <li className="admin-empty">Brak tagów własnych.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

interface TagRowProps {
  tag: Tag;
  allTags: Tag[];
  onError: (message: string | null) => void;
}

function TagRow({ tag, allTags, onError }: TagRowProps) {
  const { updateTag, isUpdating, deleteTag, isDeleting } = useTagMutations();
  const [name, setName] = useState(tag.name);
  const [weight, setWeight] = useState(tag.weight);
  const dimension = TAG_DIMENSIONS.find((item) => item.value === tag.dimension);
  const changed = name.trim() !== tag.name || weight !== tag.weight;
  // UI only: custom tag names show as a pill until the pencil opens the name field.
  const [isRenaming, setIsRenaming] = useState(false);

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
    <li className={`tags-row${dimension ? ' tags-row--base' : ''}`}>
      {isRenaming ? (
        <span className="tags-row__name-cell">
          <input
            type="text"
            className="admin-input admin-input--inline tags-row__name"
            aria-label="Nazwa tagu"
            maxLength={64}
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && changed && name.trim()) void save();
              if (event.key === 'Escape') {
                setName(tag.name);
                setIsRenaming(false);
              }
            }}
          />
        </span>
      ) : (
        <span
          className="tags-row__name-cell"
          title={dimension ? 'Nazw ocen nie można zmieniać.' : undefined}
        >
          <span className="tags-pill">
            <Badge tone={tagTone(tag, allTags)}>{name}</Badge>
          </span>
          {dimension ? (
            <Lock size={12} className="tags-row__lock" aria-hidden="true" />
          ) : (
            <button
              type="button"
              className="admin-icon-btn tags-row__rename"
              title="Zmień nazwę"
              onClick={() => setIsRenaming(true)}
            >
              <Pencil size={13} />
            </button>
          )}
        </span>
      )}
      <label className="tags-weight">
        <span className="tags-weight__label">waga</span>
        <input
          type="number"
          className="admin-input admin-input--inline admin-input--weight"
          aria-label="Waga tagu"
          min={0}
          max={TAG_WEIGHT_MAX}
          value={weight}
          onChange={(event) => setWeight(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && changed) void save();
          }}
        />
      </label>
      <button
        type="button"
        className="admin-icon-btn admin-icon-btn--success"
        title="Zapisz"
        disabled={!changed || !name.trim() || isUpdating}
        onClick={() => void save()}
      >
        <Check size={15} />
      </button>
      <button
        type="button"
        className="admin-icon-btn admin-icon-btn--danger"
        title={dimension ? 'Ocen nie można usuwać.' : 'Usuń tag'}
        disabled={dimension !== undefined || isDeleting}
        onClick={() => void remove()}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
