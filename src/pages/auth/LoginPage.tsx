import { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/layout/BrandLogo';
import AuthAppearance from './AuthAppearance';
import LoginBackground from './LoginBackground';
import './AuthPages.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { login, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      // React state update in AuthContext will automatically trigger RequireGuest to redirect
    } catch {
      // Error is handled by context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <LoginBackground avoidRef={cardRef} />
      <AuthAppearance />
      <div ref={cardRef} className="auth-card">
        <BrandLogo height={30} className="auth-logo" />

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-header">
            <h1>Witaj ponownie</h1>
            <p>Zaloguj się do platformy anotacji</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          <div className="auth-fields">
            <div className="form-group">
              <label htmlFor="username">Nazwa użytkownika</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                placeholder="np. m.nowak"
                className={`auth-input${error ? ' auth-input--invalid' : ''}`}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Hasło</label>
              <div className="auth-password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className={`auth-input${error ? ' auth-input--invalid' : ''}`}
                />
                <button
                  type="button"
                  className="auth-password__toggle"
                  onClick={() => setShowPassword((shown) => !shown)}
                  title={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading && <span className="auth-button__spinner" aria-hidden="true" />}
            {loading ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>

        <div className="auth-footer">Nie masz konta? Skontaktuj się z administratorem.</div>
      </div>
    </div>
  );
}
