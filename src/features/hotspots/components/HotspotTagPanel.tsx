import { Check, PenTool, Plus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import type { Hotspot } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotMutations } from '../hooks/useHotspots';
import { useHotspotTagMutations, useTagMutations, useTags } from '../hooks/useTags';
import type { HotspotMode } from '../utils/hotspotReview';
import {
  CUSTOM_TAG_DEFAULT_WEIGHT,
  customTags,
  dimensionTags,
  maxCustomWeight,
  TAG_DIMENSIONS,
} from '../utils/hotspotTags';
import './Hotspots.css';

interface HotspotTagPanelProps {
  hotspot: Hotspot;
  /** Assessing offers moving on to reannotation; reannotating offers marking the hotspot as reannotated. */
  mode: HotspotMode;
  /** Opens the hotspot for reannotation. */
  onReannotate: () => void;
}

/** The expert's verdict on a hotspot (importance, accuracy), its custom tags, and its reannotated mark. */
export default function HotspotTagPanel({ hotspot, mode, onReannotate }: HotspotTagPanelProps) {
  const { data: tags = [] } = useTags();
  const { addTag, removeTag, isTagging } = useHotspotTagMutations();
  const { createTag, isCreating } = useTagMutations();
  const { updateHotspot, isUpdating } = useHotspotMutations();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(CUSTOM_TAG_DEFAULT_WEIGHT);
  const [error, setError] = useState<string | null>(null);
  const ownIds = new Set(hotspot.tags.map((tag) => tag.id));
  const ownCustom = hotspot.tags.filter((tag) => tag.dimension === null);
  const otherCustom = customTags(tags).filter((tag) => !ownIds.has(tag.id));
  const weightMax = maxCustomWeight(tags);
  const isTagged = TAG_DIMENSIONS.every(({ value }) => hotspot.tags.some((tag) => tag.dimension === value));

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    try {
      await action();
    } catch (requestError) {
      setError(getErrorMessage(requestError, failure));
    }
  };

  const add = (tagId: number) =>
    run(() => addTag({ hotspotId: hotspot.id, tagId }), 'Nie udało się dodać tagu.');
  const remove = (tagId: number) =>
    run(() => removeTag({ hotspotId: hotspot.id, tagId }), 'Nie udało się usunąć tagu.');

  const create = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      const tag = await createTag({ name, weight: newWeight });
      setNewName('');
      setIsAdding(false);
      await addTag({ hotspotId: hotspot.id, tagId: tag.id });
    }, 'Nie udało się utworzyć tagu.');
  };

  return (
    <div className="hotspot-tag-panel">
      {TAG_DIMENSIONS.map((dimension) => (
        <div key={dimension.value} className="hotspot-tag-panel__row">
          <span className="hotspot-tag-panel__label">{dimension.label}</span>
          <div className="btn-group">
            {dimensionTags(tags, dimension.value).map((tag) => (
              <Button
                key={tag.id}
                active={ownIds.has(tag.id)}
                disabled={isTagging}
                title={ownIds.has(tag.id) ? 'Kliknij ponownie, aby usunąć ocenę' : `Waga: ${tag.weight}`}
                onClick={() => void (ownIds.has(tag.id) ? remove(tag.id) : add(tag.id))}
              >
                {tag.name}
              </Button>
            ))}
          </div>
        </div>
      ))}
      {mode === 'assess' && (
        <Button
          variant="primary"
          icon={<PenTool size={14} />}
          disabled={!isTagged}
          title={isTagged ? 'Otwórz hotspot w trybie REANNOTUJ' : 'Najpierw ustaw ważność i poprawność'}
          onClick={onReannotate}
        >
          Reannotuj obraz
        </Button>
      )}

      <div className="hotspot-tag-panel__row">
        <span className="hotspot-tag-panel__label">Tagi</span>
        <div className="hotspot-tags">
          {ownCustom.length === 0 && <span className="hotspot-tag-panel__empty">Brak</span>}
          {ownCustom.map((tag) => (
            <span key={tag.id} className="hotspot-tag-panel__chip">
              <Badge>{tag.name}</Badge>
              <Button
                variant="ghost"
                icon={<X size={12} />}
                aria-label={`Usuń tag ${tag.name}`}
                disabled={isTagging}
                onClick={() => void remove(tag.id)}
              />
            </span>
          ))}
        </div>
      </div>
      {otherCustom.length > 0 && (
        <select
          className="hotspot-sort__select"
          aria-label="Dodaj istniejący tag"
          value=""
          disabled={isTagging}
          onChange={(event) => void add(Number(event.target.value))}
        >
          <option value="" disabled>
            Dodaj istniejący tag…
          </option>
          {otherCustom.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name} (waga {tag.weight})
            </option>
          ))}
        </select>
      )}
      {isAdding ? (
        <form className="hotspot-tag-panel__new" onSubmit={create}>
          <input
            value={newName}
            placeholder="Nowy tag…"
            aria-label="Nazwa nowego tagu"
            maxLength={64}
            disabled={isCreating}
            onChange={(event) => setNewName(event.target.value)}
          />
          <input
            type="number"
            className="hotspot-tag-panel__weight"
            value={newWeight}
            min={0}
            max={weightMax}
            aria-label="Waga nowego tagu"
            title={`Waga od 0 do ${weightMax}: tagi własne ważą mniej niż ważność i poprawność.`}
            disabled={isCreating}
            onChange={(event) => setNewWeight(Number(event.target.value))}
          />
          <Button
            type="submit"
            icon={<Plus size={16} />}
            title="Utwórz tag i dodaj go do hotspotu"
            aria-label="Utwórz tag"
            disabled={isCreating || !newName.trim()}
          />
          <Button variant="ghost" icon={<X size={16} />} aria-label="Anuluj nowy tag" onClick={() => setIsAdding(false)} />
        </form>
      ) : (
        <Button
          variant="ghost"
          className="hotspot-tag-panel__add"
          icon={<Plus size={14} />}
          onClick={() => setIsAdding(true)}
        >
          Nowy tag
        </Button>
      )}
      {mode === 'reannotate' ? (
        <Button
          variant={hotspot.reannotated_at ? 'default' : 'primary'}
          icon={<Check size={14} />}
          disabled={isUpdating}
          onClick={() =>
            void run(
              () => updateHotspot({ hotspotId: hotspot.id, changes: { reannotated: !hotspot.reannotated_at } }),
              'Nie udało się zmienić oznaczenia.',
            )
          }
        >
          {hotspot.reannotated_at ? 'Cofnij „poprawione”' : 'Oznacz jako poprawione'}
        </Button>
      ) : (
        hotspot.reannotated_at && <Badge tone="success">Poprawione</Badge>
      )}
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
