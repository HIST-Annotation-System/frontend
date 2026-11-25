import { useState } from 'react';
import Button from '../../../components/ui/Button';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import type { Hotspot } from '../../../types/hotspot';
import { getErrorMessage } from '../../../utils/errors';
import { useReannotationActions } from '../hooks/useReannotation';
import './Reannotation.css';

const statusText = ({ reannotation, reannotated_at }: Hotspot): string => {
  if (reannotated_at !== null) return 'W pełni poprawione';
  if (reannotation.my_status === 'confirmed') return 'Zatwierdzone, czekam na pozostałych';
  if (reannotation.my_status === 'draft') return 'Poprawiasz własną warstwę';
  return 'Nie rozpoczęto';
};

/** The steps of one's own reannotation: start (a layer of one's own), confirm it, or take the confirmation back. */
export default function ReannotationControls({ hotspot }: { hotspot: Hotspot }) {
  const { start, confirm, unconfirm, isPending } = useReannotationActions(hotspot.id);
  const [error, setError] = useState<string | null>(null);
  const mine = hotspot.reannotation.my_status;
  const waitingForModel = hotspot.segmentation_status === 'pending';

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    try {
      await action();
    } catch (requestError) {
      setError(getErrorMessage(requestError, failure));
    }
  };

  return (
    <>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      <p className="reannotation-status">{statusText(hotspot)}</p>
      {mine === null && (
        <Button
          variant="primary"
          className="hotspot-tag-panel__action"
          disabled={isPending || waitingForModel}
          title={waitingForModel ? 'Model jeszcze segmentuje ten obraz' : 'Skopiuj komórki modelu do własnej warstwy'}
          onClick={() => void run(start, 'Nie udało się rozpocząć reannotacji.')}
        >
          Rozpocznij reannotację
        </Button>
      )}
      {mine === 'draft' && (
        <Button
          variant="primary"
          className="hotspot-tag-panel__action"
          disabled={isPending}
          onClick={() => void run(confirm, 'Nie udało się zatwierdzić anotacji.')}
        >
          Zatwierdź moje anotacje
        </Button>
      )}
      {mine === 'confirmed' && (
        <Button
          variant="ghost"
          className="hotspot-tag-panel__undo"
          disabled={isPending}
          onClick={() => void run(unconfirm, 'Nie udało się cofnąć zatwierdzenia.')}
        >
          Cofnij zatwierdzenie
        </Button>
      )}
    </>
  );
}
