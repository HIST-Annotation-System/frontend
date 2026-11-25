import { Check } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { usePriorityWeights } from '../../features/hotspots/hooks/usePriorityWeights';
import type { PriorityComponent, PriorityWeights } from '../../types/priority';
import { getErrorMessage } from '../../utils/errors';
import { AdminSkeleton } from './AdminParts';

const WEIGHT_MAX = 100;

const COMPONENTS: { value: PriorityComponent; label: string; hint: string }[] = [
  { value: 'cell_density', label: 'Gęstość komórek', hint: 'Komórki modelu na mm²; bez wyniku modelu składnik jest pomijany.' },
  { value: 'hematoxylin', label: 'Hematoksylina', hint: 'Ilość barwnika jąder na obrazie.' },
  { value: 'glcm_contrast', label: 'Kontrast tekstury (GLCM)', hint: 'Jak bardzo różnią się sąsiednie piksele.' },
  { value: 'edge_density', label: 'Gęstość krawędzi', hint: 'Ilość drobnych, ostrych struktur.' },
  { value: 'entropy', label: 'Entropia', hint: 'Zróżnicowanie jasności obrazu.' },
];

/** How much each measurement counts towards the estimated priority of unrated hotspots (the "Oceniaj" order). */
export default function PriorityWeightsPage() {
  const { data, isPending, error, save, isSaving } = usePriorityWeights();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Wagi szacowanego priorytetu</h1>
      </div>
      <p className="admin-page-desc">
        Szacowany priorytet porządkuje nieocenione hotspoty w widoku „Oceniaj”. Każdy składnik jest zamieniany na pozycję
        wśród wyświetlanych hotspotów (0–1), a wynik to średnia ważona tych pozycji. Wagi są względne, 0 wyłącza składnik,
        a zmieniają się tylko tutaj, ręcznie, dla wszystkich organizacji. Hotspot bez któregoś składnika jest oceniany
        z pozostałych, a prawie puste szkło trafia na koniec.
      </p>
      {error && <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać wag.')} />}
      {isPending && !error && <AdminSkeleton rows={5} />}
      {data && (
        // Keyed by the saved values, so the form starts from them after a save.
        <WeightsForm key={JSON.stringify(data)} weights={data} saving={isSaving} onSave={save} />
      )}
    </div>
  );
}

interface WeightsFormProps {
  weights: PriorityWeights;
  saving: boolean;
  onSave: (weights: PriorityWeights) => Promise<unknown>;
}

function WeightsForm({ weights, saving, onSave }: WeightsFormProps) {
  const [fields, setFields] = useState(() =>
    Object.fromEntries(COMPONENTS.map(({ value }) => [value, String(weights[value])])) as Record<PriorityComponent, string>,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const parsed = Object.fromEntries(COMPONENTS.map(({ value }) => [value, Number(fields[value])])) as PriorityWeights;
  const isValid = (component: PriorityComponent) =>
    fields[component].trim() !== '' && parsed[component] >= 0 && parsed[component] <= WEIGHT_MAX;
  const allValid = COMPONENTS.every(({ value }) => isValid(value));
  const anyOn = COMPONENTS.some(({ value }) => parsed[value] > 0);
  const unchanged = COMPONENTS.every(({ value }) => parsed[value] === weights[value]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSave(parsed);
      setSaved(true);
      savedTimer.current = window.setTimeout(() => setSaved(false), 3000);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się zapisać wag.'));
    }
  };

  return (
    <form className="admin-card" onSubmit={(event) => void submit(event)}>
      <header className="admin-card__header">
        <h2>Składniki</h2>
        <span className="admin-saved" role="status">
          {saved && (
            <>
              <Check size={14} aria-hidden="true" />
              Zapisano
            </>
          )}
        </span>
      </header>
      <div className="admin-card__body">
        <div className="admin-card__fields">
          {COMPONENTS.map(({ value, label, hint }) => (
            <label key={value} className="admin-field">
              <span className="admin-field__label">{label}</span>
              <input
                className={`admin-input admin-input--weight${fields[value].trim() !== '' && !isValid(value) ? ' admin-input--invalid' : ''}`}
                type="number"
                min={0}
                max={WEIGHT_MAX}
                step={0.05}
                value={fields[value]}
                aria-invalid={fields[value].trim() !== '' && !isValid(value) ? true : undefined}
                onChange={(event) => setFields({ ...fields, [value]: event.target.value })}
              />
              <span className="admin-hint">{hint}</span>
            </label>
          ))}
        </div>
        {allValid && !anyOn && <ErrorMessage message="Co najmniej jeden składnik musi mieć wagę większą od 0." />}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div>
          <Button type="submit" variant="primary" disabled={saving || !allValid || !anyOn || unchanged}>
            {saving ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </div>
      </div>
    </form>
  );
}
