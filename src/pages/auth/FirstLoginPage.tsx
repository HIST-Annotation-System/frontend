import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dictionariesApi } from '../../services/dictionariesApi';
import { AlertCircle, Check, CheckCircle2, Dot, KeyRound } from 'lucide-react';
import BrandLogo from '../../components/layout/BrandLogo';
import AuthAppearance from './AuthAppearance';
import LoginBackground from './LoginBackground';
import './AuthPages.css';

const STRENGTH_LABELS = ['Siła hasła', 'Słabe', 'Średnie', 'Dobre', 'Silne'];
const STRENGTH_TONES = ['', 'danger', 'warn', 'success', 'success'];

/** Visual hint only; the checks in handleSubmit stay the source of truth. */
function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/\d/.test(password) && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(password)) score++;
  if (/[^A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(password)) score++;
  return Math.max(1, score);
}

export default function FirstLoginPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { user, setupProfile, error } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => dictionariesApi.getCategories(),
  });

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError("Hasła nie pasują do siebie.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    setLoading(true);
    try {
      await setupProfile({
        new_password: password,
        first_name: firstName,
        last_name: lastName,
        category_ids: selectedCategories
      });
      // React state update in AuthContext will automatically trigger RequireFirstLogin to redirect
    } catch {
      // Error handled by context mostly
    } finally {
      setLoading(false);
    }
  };

  const score = passwordScore(password);
  const strengthTone = STRENGTH_TONES[score];
  const passwordRules: [string, boolean][] = [
    ['min. 8 znaków', password.length >= 8],
    ['wielka litera i cyfra', /\d/.test(password) && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(password)],
    ['znak specjalny', /[^A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(password)],
    ['min. 12 znaków', password.length >= 12],
  ];
  const passwordsMatch = confirmPassword !== '' && confirmPassword === password;
  const passwordsDiffer = confirmPassword !== '' && confirmPassword !== password;

  return (
    <div className="auth-container">
      <LoginBackground avoidRef={cardRef} />
      <AuthAppearance />
      <div ref={cardRef} className="auth-card auth-card--wide">
        <BrandLogo height={30} className="auth-logo" />

        <form onSubmit={handleSubmit} className="auth-form auth-form--setup">
          <div className="auth-header">
            <h1>Pierwsze logowanie</h1>
            <p>Uzupełnij swój profil aby kontynuować</p>
            {user && (
              <span className="auth-header__account">
                <KeyRound size={14} aria-hidden="true" />
                <span>
                  Konto <span className="auth-header__username">{user.username}</span> · zalogowano hasłem tymczasowym
                </span>
              </span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Imię</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
                autoComplete="given-name"
                className="auth-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Nazwisko</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={loading}
                autoComplete="family-name"
                className="auth-input"
              />
            </div>
          </div>

          <div className="auth-password-block">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Nowe hasło (min. 8 znaków)</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="auth-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Powtórz hasło</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className={`auth-input${passwordsDiffer ? ' auth-input--invalid' : ''}${passwordsMatch ? ' auth-input--valid' : ''}`}
                />
              </div>
            </div>

            <div className="auth-strength">
              <div className="auth-strength__meter">
                <div className="auth-strength__segments">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`auth-strength__segment${i < score ? ` auth-strength__segment--${strengthTone}` : ''}`}
                    />
                  ))}
                </div>
                <span className={`auth-strength__label${score ? ` auth-strength__label--${strengthTone}` : ''}`}>
                  {STRENGTH_LABELS[score]}
                </span>
              </div>
              <div className="auth-strength__rules">
                {passwordRules.map(([label, ok]) => (
                  <span key={label} className={`auth-strength__rule${ok ? ' auth-strength__rule--ok' : ''}`}>
                    {ok ? <Check size={13} aria-hidden="true" /> : <Dot size={13} aria-hidden="true" />}
                    {label}
                  </span>
                ))}
              </div>
              {(passwordsMatch || passwordsDiffer) && (
                <span className={`auth-strength__match${passwordsDiffer ? ' auth-strength__match--bad' : ''}`}>
                  {passwordsDiffer ? <AlertCircle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                  {passwordsDiffer ? 'Hasła nie są takie same.' : 'Hasła są zgodne.'}
                </span>
              )}
            </div>
          </div>

          {categories && categories.length > 0 && (
            <div className="form-group">
              <div className="auth-categories__header">
                <span className="auth-label" id="categories-label">Kategorie, którymi się zajmujesz</span>
                <span className="auth-categories__count">
                  {selectedCategories.length} z {categories.length}
                </span>
              </div>
              <div className="auth-categories" role="group" aria-labelledby="categories-label">
                {categories.map(cat => {
                  const selected = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`auth-chip${selected ? ' auth-chip--selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => toggleCategory(cat.id)}
                      disabled={loading}
                    >
                      {selected && <Check size={14} aria-hidden="true" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(error || localError) && (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{localError || error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading && <span className="auth-button__spinner" aria-hidden="true" />}
            {loading ? 'Zapisywanie...' : 'Zapisz i kontynuuj'}
          </button>
        </form>

        <div className="auth-footer">Problem z kontem? Skontaktuj się z administratorem.</div>
      </div>
    </div>
  );
}
