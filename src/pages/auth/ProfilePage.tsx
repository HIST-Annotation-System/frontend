import { useMutation } from '@tanstack/react-query';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usersApi } from '../../services/usersApi';
import type { ProfileUpdate } from '../../types/user';
import { ROLE_LABELS } from '../../utils/roles';
import './ProfilePage.css';

const PASSWORD_MIN_LENGTH = 8;

type SectionName = 'personal' | 'password';

interface SectionProps {
  title: string;
  /** The button that starts editing; left out for a read-only section. */
  action?: ReactNode;
  /** Shows "Zapisano" in the header for a moment after a save. */
  saved?: boolean;
  children: ReactNode;
}

function Section({ title, action, saved = false, children }: SectionProps) {
  return (
    <section className="profile-section">
      <header className="profile-section__header">
        <h2>{title}</h2>
        <span className="profile-section__saved" role="status">
          {saved && (
            <>
              <Check size={14} aria-hidden="true" />
              Zapisano
            </>
          )}
        </span>
        {action}
      </header>
      <div className="profile-section__body">{children}</div>
    </section>
  );
}

interface SectionFormProps {
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
  children: ReactNode;
}

/** The editing state of a section: Enter saves, Esc cancels, the error sits under the fields it belongs to. */
function SectionForm({ onSubmit, onCancel, pending, error, children }: SectionFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form
      className="profile-form"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
    >
      {children}
      {error && (
        <p className="profile-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="profile-form__actions">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Zapisywanie…' : 'Zapisz'}
        </Button>
        <Button onClick={onCancel} disabled={pending}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

interface FormProps {
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (data: ProfileUpdate) => void;
}

function NameForm({ first, last, ...form }: FormProps & { first: string; last: string }) {
  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);
  const id = useId();
  return (
    <SectionForm
      {...form}
      onSubmit={() => form.onSave({ first_name: firstName.trim(), last_name: lastName.trim() })}
    >
      <div className="profile-form__field">
        <label htmlFor={`${id}-first`}>Imię</label>
        <input
          id={`${id}-first`}
          value={firstName}
          autoComplete="given-name"
          autoFocus
          onChange={(event) => setFirstName(event.target.value)}
        />
      </div>
      <div className="profile-form__field">
        <label htmlFor={`${id}-last`}>Nazwisko</label>
        <input
          id={`${id}-last`}
          value={lastName}
          autoComplete="family-name"
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>
    </SectionForm>
  );
}

function PasswordForm(form: FormProps) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [visible, setVisible] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const id = useId();
  const submit = () => {
    if (password.length < PASSWORD_MIN_LENGTH) {
      setInvalid(`Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`);
    } else if (password !== repeat) {
      setInvalid('Hasła nie są takie same.');
    } else {
      setInvalid(null);
      form.onSave({ password });
    }
  };
  return (
    <SectionForm {...form} error={invalid ?? form.error} onSubmit={submit}>
      <div className="profile-form__field">
        <label htmlFor={`${id}-new`}>Nowe hasło</label>
        <div className="profile-form__password">
          <input
            id={`${id}-new`}
            type={visible ? 'text' : 'password'}
            value={password}
            autoComplete="new-password"
            autoFocus
            aria-describedby={`${id}-hint`}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="profile-form__eye"
            aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
        <span className="profile-form__hint" id={`${id}-hint`}>
          Co najmniej {PASSWORD_MIN_LENGTH} znaków.
        </span>
      </div>
      <div className="profile-form__field">
        <label htmlFor={`${id}-repeat`}>Powtórz hasło</label>
        <input
          id={`${id}-repeat`}
          type={visible ? 'text' : 'password'}
          value={repeat}
          autoComplete="new-password"
          onChange={(event) => setRepeat(event.target.value)}
        />
      </div>
    </SectionForm>
  );
}

export default function ProfilePage() {
  useDocumentTitle('Mój profil');
  const { user, refetch } = useAuth();
  const [editing, setEditing] = useState<SectionName | null>(null);
  const [saved, setSaved] = useState<SectionName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: ProfileUpdate) => usersApi.updateAccount(user!.id, data),
  });

  const start = (section: SectionName) => {
    setError(null);
    setSaved(null);
    setEditing(section);
  };
  const stop = () => {
    setError(null);
    setEditing(null);
  };
  const save = async (section: SectionName, data: ProfileUpdate) => {
    setError(null);
    try {
      await mutateAsync(data);
      await refetch();
      setEditing(null);
      setSaved(section);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(null), 3000);
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? requestError.message : 'Wystąpił błąd podczas aktualizacji.');
    }
  };

  if (!user) return null;

  const firstName = user.profile?.first_name ?? '';
  const lastName = user.profile?.last_name ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = (
    `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}` || user.username.slice(0, 2)
  ).toUpperCase();
  const form = (section: SectionName): FormProps => ({
    pending: isPending,
    error: editing === section ? error : null,
    onCancel: stop,
    onSave: (data) => void save(section, data),
  });
  const editButton = (section: SectionName, label = 'Edytuj') =>
    editing === section ? null : (
      <Button className="btn-sm" onClick={() => start(section)}>
        {label}
      </Button>
    );

  return (
    <div className="profile-page">
      <header className="profile-page__bar">
        <h1 className="page-title">Mój profil</h1>
      </header>
      <div className="profile-page__scroll">
        <div className="profile-content">
          <section className="profile-identity" aria-label="Twoje konto">
            <span className="profile-avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="profile-identity__text">
              <p className="profile-identity__name">{fullName || user.username}</p>
              <p className="profile-identity__meta">
                <span className="profile-role">{ROLE_LABELS[user.role]}</span>
                {user.organization && <span>{user.organization.name}</span>}
              </p>
            </div>
          </section>

          <Section title="Dane osobowe" saved={saved === 'personal'} action={editButton('personal')}>
            {editing === 'personal' ? (
              <NameForm {...form('personal')} first={firstName} last={lastName} />
            ) : (
              <dl className="kv profile-kv">
                <dt>Imię</dt>
                <dd>{firstName || <span className="profile-muted">Brak</span>}</dd>
                <dt>Nazwisko</dt>
                <dd>{lastName || <span className="profile-muted">Brak</span>}</dd>
              </dl>
            )}
          </Section>

          <Section title="Konto">
            <dl className="kv profile-kv">
              <dt>Nazwa użytkownika</dt>
              <dd className="profile-kv__mono">{user.username}</dd>
              <dt>Rola</dt>
              <dd>{ROLE_LABELS[user.role]}</dd>
              {user.organization && (
                <>
                  <dt>Organizacja</dt>
                  <dd>{user.organization.name}</dd>
                </>
              )}
            </dl>
            <p className="profile-hint">Te dane zmienia administrator.</p>
          </Section>

          <Section title="Bezpieczeństwo" saved={saved === 'password'} action={editButton('password', 'Zmień hasło')}>
            {editing === 'password' ? (
              <PasswordForm {...form('password')} />
            ) : (
              <dl className="kv profile-kv">
                <dt>Hasło</dt>
                <dd>••••••••</dd>
              </dl>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
