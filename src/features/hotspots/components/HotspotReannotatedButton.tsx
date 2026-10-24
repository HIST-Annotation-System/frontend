import { useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import type { Hotspot } from '../../../types/hotspot';
import { useHotspotMutations } from '../hooks/useHotspots';
import { tagErrorMessage } from '../utils/hotspotTags';
import './Hotspots.css';

/** Marks a reannotated hotspot as corrected, or takes the mark back; the footer of the reannotation panel. */
export default function HotspotReannotatedButton({ hotspot }: { hotspot: Hotspot }) {
  const { updateHotspot, isUpdating } = useHotspotMutations();
  const [error, setError] = useState<string | null>(null);

  const mark = async (reannotated: boolean) => {
    setError(null);
    try {
      await updateHotspot({ hotspotId: hotspot.id, changes: { reannotated } });
    } catch (requestError) {
      setError(tagErrorMessage(requestError, 'Nie udało się zmienić oznaczenia.'));
    }
  };

  return (
    <>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {hotspot.reannotated_at ? (
        <Button
          variant="ghost"
          className="hotspot-tag-panel__undo"
          disabled={isUpdating}
          onClick={() => void mark(false)}
        >
          Cofnij „poprawione”
        </Button>
      ) : (
        <Button
          variant="primary"
          className="hotspot-tag-panel__action"
          disabled={isUpdating}
          onClick={() => void mark(true)}
        >
          Oznacz jako poprawione
        </Button>
      )}
    </>
  );
}
