import { Plus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import type { Hotspot } from '../../../types/hotspot';
import { useHotspotTagMutations, useTagMutations, useTags } from '../hooks/useTags';
import type { HotspotMode } from '../utils/hotspotReview';
import {
  CUSTOM_TAG_DEFAULT_WEIGHT,
  customTags,
  dimensionTags,
  maxCustomWeight,
  TAG_DIMENSIONS,
  tagErrorMessage,
} from '../utils/hotspotTags';
import { TagPill, VerdictMark } from './TagMarks';
import './Hotspots.css';

interface HotspotTagPanelProps {
  hotspot: Hotspot;
  /** Assessing offers moving on to reannotation (marking it reannotated is the viewer panel's footer). */
  mode: HotspotMode;
  /** Opens the hotspot for reannotation. */
  onReannotate: () => void;
}

/** The expert's verdict on a hotspot (importance, accuracy) and its custom tags. */
export default function HotspotTagPanel({ hotspot, mode, onReannotate }: HotspotTagPanelProps) {
  const { data: tags = [] } = useTags();
  const { addTag, removeTag, isTagging } = useHotspotTagMutations();
  const { createTag, isCreating } = useTagMutations();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(CUSTOM_TAG_DEFAULT_WEIGHT);
  const [error, setError] = useState<string | null>(null);
  const ownIds = new Set(hotspot.tags.map((tag) => tag.id));
  const ownCustom = hotspot.tags.filter((tag) => tag.dimension === null);
  const otherCustom = customTags(tags).filter((tag) => !ownIds.has(tag.id));
  const weightMax = maxCustomWeight(tags);
  const isTagged = TAG_DIMENSIONS.every(({ value }) => hotspot.tags.some((tag) => tag.dimension === value));

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    try {
      await action();
    } catch (requestError) {
      setError(tagErrorMessage(requestError, failure));
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
      setIsMenuOpen(false);
      await addTag({ hotspotId: hotspot.id, tagId: tag.id });
    }, 'Nie udało się utworzyć tagu.');
  };

  return (
    <div className="hotspot-tag-panel">
      <div className="hotspot-verdict">
        {TAG_DIMENSIONS.map((dimension) => {
          const options = dimensionTags(tags, dimension.value);
          return (
            <div key={dimension.value} className="hotspot-verdict__row">
              <span className="hotspot-tag-panel__label">{dimension.label}</span>
              <div
                className="hotspot-verdict__options"
                role="group"
                aria-label={dimension.label}
                style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
              >
                {options.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="hotspot-verdict__option"
                    aria-pressed={ownIds.has(tag.id)}
                    title={ownIds.has(tag.id) ? 'Kliknij ponownie, aby usunąć ocenę' : `Waga: ${tag.weight}`}
                    onClick={() => void (ownIds.has(tag.id) ? remove(tag.id) : add(tag.id))}
                  >
                    <VerdictMark tag={tag} allTags={tags} labelled size={14} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hotspot-tag-panel__row">
        <div className="hotspot-tag-panel__row-head">
          <span className="hotspot-tag-panel__label">Tagi</span>
          <span className="hotspot-tag-panel__score">wynik {hotspot.score}</span>
        </div>
        <div className="hotspot-tag-panel__chips">
          {ownCustom.map((tag) => (
            <TagPill key={tag.id} tag={tag}>
              <span className="hotspot-tag-panel__weight-label">·{tag.weight}</span>
              <button
                type="button"
                className="hotspot-tag-panel__chip-remove"
                title="Usuń tag"
                aria-label={`Usuń tag ${tag.name}`}
                disabled={isTagging}
                onClick={() => void remove(tag.id)}
              >
                <X size={12} />
              </button>
            </TagPill>
          ))}
          <div className="hotspot-tag-panel__add-wrap">
            <button
              type="button"
              className="hotspot-tag-panel__add"
              aria-expanded={isMenuOpen}
              aria-haspopup="dialog"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              Dodaj tag
            </button>
            {isMenuOpen && (
              <>
                <div className="hotspot-tag-panel__backdrop" onClick={() => setIsMenuOpen(false)} />
                <div className="hotspot-tag-panel__menu" role="dialog" aria-label="Dodaj tag">
                  {otherCustom.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="hotspot-tag-panel__choice"
                      disabled={isTagging}
                      onClick={() => {
                        setIsMenuOpen(false);
                        void add(tag.id);
                      }}
                    >
                      <span className="hotspot-tag-panel__choice-name">
                        <TagPill tag={tag} />
                      </span>
                      <span className="hotspot-tag-panel__weight-label">waga {tag.weight}</span>
                    </button>
                  ))}
                  {otherCustom.length > 0 && <span className="hotspot-tag-panel__menu-divider" aria-hidden="true" />}
                  <form className="hotspot-tag-panel__new" onSubmit={create}>
                    <input
                      value={newName}
                      placeholder="Nowy tag…"
                      aria-label="Nazwa nowego tagu"
                      maxLength={64}
                      disabled={isCreating}
                      autoFocus
                      onChange={(event) => setNewName(event.target.value)}
                    />
                    <input
                      type="number"
                      className="hotspot-tag-panel__weight"
                      value={newWeight}
                      min={0}
                      max={weightMax}
                      aria-label="Waga nowego tagu"
                      title={`Waga od 0 do ${weightMax}: tagi własne ważą mniej niż priorytet i poprawność.`}
                      disabled={isCreating}
                      onChange={(event) => setNewWeight(Number(event.target.value))}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      icon={<Plus size={14} />}
                      title="Utwórz tag i dodaj go do hotspotu"
                      aria-label="Utwórz tag"
                      disabled={isCreating || !newName.trim()}
                    />
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {mode === 'assess' && (
        <Button
          variant="primary"
          className="hotspot-tag-panel__action"
          disabled={!isTagged}
          title={isTagged ? 'Otwórz hotspot w trybie „Reannotuj”' : 'Najpierw ustaw priorytet i poprawność'}
          onClick={onReannotate}
        >
          Reannotuj obraz
        </Button>
      )}
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
