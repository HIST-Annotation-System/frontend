import { useState, type FormEvent } from 'react';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import OrganizationSelect from '../../features/organizations/components/OrganizationSelect';
import { useOrganizations } from '../../features/organizations/hooks/useOrganizations';
import { useAgreementSettings } from '../../features/reannotation/hooks/useReannotation';
import { METRIC_LABELS, MIN_CONFIRMED } from '../../features/reannotation/utils/reannotation';
import type { AgreementMetric, AgreementSettings } from '../../types/reannotation';
import { getErrorMessage } from '../../utils/errors';
import { isSystemAdmin } from '../../utils/roles';

const METRICS: AgreementMetric[] = ['kappa', 'iou'];

/** What the annotators of an organization have to agree on, and how much, for a hotspot to count as reannotated. */
export default function AgreementPage() {
  const { user } = useAuth();
  const { organizations } = useOrganizations();
  const systemAdmin = isSystemAdmin(user);
  // The system admin names the organization; everyone else's is their own.
  const [chosen, setChosen] = useState<number | null>(null);
  const organizationId = systemAdmin ? (chosen ?? organizations[0]?.id) : undefined;
  const known = !systemAdmin || organizationId !== undefined;
  const { data, isPending, error, save, isSaving } = useAgreementSettings(organizationId, known);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Zgodność reannotacji</h1>
        {systemAdmin && (
          <OrganizationSelect organizations={organizations} value={organizationId ?? null} onChange={setChosen} />
        )}
      </div>
      <p>
        Obraz jest w pełni poprawiony, gdy co najmniej {MIN_CONFIRMED} anotatorów zatwierdziło swoje anotacje, a wybrana
        miara zgodności osiąga próg T. Obie miary są zawsze pokazywane; tylko wybrana blokuje.
      </p>
      {error && <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać ustawień.')} />}
      {known && isPending && !error && <Spinner label="Wczytywanie ustawień…" />}
      {data && (
        // Keyed by the saved values, so the form starts from them after a save or another organization.
        <SettingsForm key={`${organizationId}:${data.metric}:${data.threshold}`} settings={data} saving={isSaving} onSave={save} />
      )}
    </div>
  );
}

interface SettingsFormProps {
  settings: AgreementSettings;
  saving: boolean;
  onSave: (settings: AgreementSettings) => Promise<unknown>;
}

function SettingsForm({ settings, saving, onSave }: SettingsFormProps) {
  const [metric, setMetric] = useState(settings.metric);
  const [threshold, setThreshold] = useState(String(settings.threshold));
  const [error, setError] = useState<string | null>(null);
  const value = Number(threshold);
  const valid = threshold.trim() !== '' && value >= 0 && value <= 1;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSave({ metric, threshold: value });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Nie udało się zapisać ustawień.'));
    }
  };

  return (
    <form className="admin-add" onSubmit={(event) => void submit(event)}>
      <label className="admin-field">
        <span className="admin-field__label">Miara zgodności</span>
        <select className="admin-input" value={metric} onChange={(event) => setMetric(event.target.value as AgreementMetric)}>
          {METRICS.map((item) => (
            <option key={item} value={item}>
              {METRIC_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field">
        <span className="admin-field__label">Próg T (od 0 do 1)</span>
        <input
          className="admin-input"
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
        />
      </label>
      <Button
        type="submit"
        variant="primary"
        disabled={saving || !valid || (metric === settings.metric && value === settings.threshold)}
      >
        Zapisz
      </Button>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
    </form>
  );
}
