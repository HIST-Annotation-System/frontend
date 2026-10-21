import { useState } from 'react';
import Button from '../../components/ui/Button';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <main className="auth-page">
      <div className="auth-page__inner">
        {/* TODO: swap the text for the HistAno SVG wordmark. */}
        <div className="auth-page__brand">HistAno</div>
        <p className="auth-page__lead">Platforma anotacji histopatologicznej</p>

        <form onSubmit={handleSubmit} className="form-stack">
          <label className="form-field">
            <span className="form-field__label">Login</span>
            <input
              className="field"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">Hasło</span>
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          {error && <ErrorMessage message={error} />}
          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? 'Logowanie…' : 'Zaloguj'}
          </Button>
        </form>
      </div>
    </main>
  );
}
