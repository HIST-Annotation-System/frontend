import { useState, type FormEvent } from 'react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Spinner from '../../components/ui/Spinner';
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
    <>
      <div className="page-strip">
        <h1 className="page-strip__title">
          Tagi hotspotów
          <span className="page-strip__count">{tags.length}</span>
        </h1>
      </div>
      <div className="admin-page__body">
        <p className="admin-page__intro">
          Wynik hotspotu to suma wag jego tagów; tryb Reannotuj sortuje według niego. Ważność i poprawność można tylko
          przeważyć. Tagi własne muszą ważyć mniej niż najlżejsza niezerowa ocena
          {cap === null ? '' : ` (obecnie < ${cap})`}.
        </p>
        <form onSubmit={(event) => void create(event)} className="admin-page__add">
          <label className="form-field">
            <span className="form-field__label">Nowy tag</span>
            <input
              className="field"
              type="text"
              maxLength={64}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="form-field form-field--narrow">
            <span className="form-field__label">Waga</span>
            <input
              className="field"
              type="number"
              min={0}
              max={maxCustomWeight(tags)}
              value={newWeight}
              onChange={(event) => setNewWeight(Number(event.target.value))}
            />
          </label>
          <Button type="submit" disabled={isCreating || !newName.trim()}>
            Dodaj
          </Button>
        </form>
        {apiError && <ErrorMessage message={apiError} onDismiss={() => setApiError(null)} />}

        {isLoading ? (
          <Spinner />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Rodzaj</th>
                <th>Nazwa</th>
                <th className="data-table__num">Waga</th>
                <th aria-label="Akcje" />
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <TagRow key={`${tag.id}:${tag.name}:${tag.weight}`} tag={tag} onError={setApiError} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function TagRow({ tag, onError }: { tag: Tag; onError: (message: string | null) => void }) {
  const { updateTag, isUpdating, deleteTag, isDeleting } = useTagMutations();
  const [name, setName] = useState(tag.name);
  const [weight, setWeight] = useState(tag.weight);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
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
    onError(null);
    try {
      await deleteTag(tag.id);
    } catch (requestError) {
      onError(getErrorMessage(requestError, 'Nie udało się usunąć tagu.'));
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  return (
    <tr>
      <td className="data-table__muted">{dimension ? dimension.label : 'własny'}</td>
      <td>
        <input
          type="text"
          className="field admin-page__inline-input"
          aria-label="Nazwa tagu"
          maxLength={64}
          value={name}
          disabled={dimension !== undefined}
          title={dimension ? 'Nazw ocen nie można zmieniać.' : undefined}
          onChange={(event) => setName(event.target.value)}
        />
      </td>
      <td className="data-table__num">
        <input
          type="number"
          className="field admin-page__inline-input admin-page__weight"
          aria-label="Waga tagu"
          min={0}
          max={TAG_WEIGHT_MAX}
          value={weight}
          onChange={(event) => setWeight(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && changed) void save();
          }}
        />
      </td>
      <td className="admin-page__row-actions">
        <Button small disabled={!changed || !name.trim() || isUpdating} onClick={() => void save()}>
          Zapisz
        </Button>
        <Button
          small
          variant="danger"
          title={dimension ? 'Ocen nie można usuwać.' : undefined}
          disabled={dimension !== undefined || isDeleting}
          onClick={() => setIsConfirmingDelete(true)}
        >
          Usuń
        </Button>
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
