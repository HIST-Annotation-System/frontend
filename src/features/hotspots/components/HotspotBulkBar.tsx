import { useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import type { HotspotTagsBulk, Tag } from '../../../types/tag';
import { getErrorMessage } from '../../../utils/errors';
import { useHotspotTagMutations, useTags } from '../hooks/useTags';
import { customTags, dimensionTags, TAG_DIMENSIONS, tagLabel } from '../utils/hotspotTags';
import './Hotspots.css';

interface HotspotBulkBarProps {
  hotspotIds: string[];
  onClear: () => void;
}

/** Tags every selected hotspot at once. */
export default function HotspotBulkBar({ hotspotIds, onClear }: HotspotBulkBarProps) {
  const { data: tags = [] } = useTags();
  const { bulkTag, isBulkTagging } = useHotspotTagMutations();
  const [error, setError] = useState<string | null>(null);

  const apply = async (changes: Pick<HotspotTagsBulk, 'add' | 'remove'>) => {
    setError(null);
    try {
      await bulkTag({ hotspot_ids: hotspotIds, ...changes });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się otagować zaznaczonych hotspotów.'));
    }
  };

  // Each select is an action: it resets to its placeholder after picking a tag.
  const actionSelect = (label: string, options: Tag[], run: (tagId: number) => void) => (
    <select
      key={label}
      className="field"
      aria-label={label}
      value=""
      disabled={isBulkTagging || options.length === 0}
      onChange={(event) => run(Number(event.target.value))}
    >
      <option value="" disabled>
        {label}…
      </option>
      {options.map((tag) => (
        <option key={tag.id} value={tag.id}>
          {tagLabel(tag)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="hotspot-bulk" role="region" aria-label="Zaznaczone hotspoty">
      <span className="hotspot-bulk__count">
        Zaznaczono: <span className="mono-data">{hotspotIds.length}</span>
      </span>
      {TAG_DIMENSIONS.map((dimension) =>
        actionSelect(`Ustaw: ${dimension.label.toLowerCase()}`, dimensionTags(tags, dimension.value), (tagId) =>
          void apply({ add: [tagId], remove: [] }),
        ),
      )}
      {actionSelect('Dodaj tag', customTags(tags), (tagId) => void apply({ add: [tagId], remove: [] }))}
      {actionSelect('Usuń tag', tags, (tagId) => void apply({ add: [], remove: [tagId] }))}
      <Button onClick={onClear}>Odznacz</Button>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
