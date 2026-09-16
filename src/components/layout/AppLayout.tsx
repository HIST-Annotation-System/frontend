import { Microscope, Moon, Sun } from 'lucide-react';
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeProvider';
import UploadStatusBar from './UploadStatusBar';
import './AppLayout.css';

/** A tab for a page that does not exist yet. */
function PlaceholderTab({ label }: { label: string }) {
  return (
    <span className="app-header__tab app-header__tab--disabled" aria-disabled="true" title="Wkrótce">
      {label}
    </span>
  );
}

export default function AppLayout() {
  const inWorkspace = useMatch('/slides/:slideId') !== null;
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            <Microscope size={18} />
          </span>
          <span className="app-header__title">Cancer Cell Annotator (WSI)</span>
        </Link>
        <div className="app-header__actions">
          <nav className="app-header__nav label-caps">
            <PlaceholderTab label="Pulpit" />
            <NavLink to="/" end className="app-header__tab">
              Biblioteka slajdów
            </NavLink>
            {inWorkspace ? (
              <span className="app-header__tab active" aria-current="page">
                Obszar roboczy
              </span>
            ) : (
              <PlaceholderTab label="Obszar roboczy" />
            )}
            <NavLink to="/administracja" className="app-header__tab">
              Administracja
            </NavLink>
            {user?.role === 'ADMIN' ? (
              <NavLink to="/admin/users" className="app-header__tab">
                Użytkownicy
              </NavLink>
            ) : (
              <PlaceholderTab label="Użytkownicy" />
            )}
          </nav>
          <Button
            variant="ghost"
            icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            title={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
            aria-label={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
            onClick={toggleTheme}
          />
          {user && <span style={{ fontSize: '0.875rem' }}>Zalogowany: <strong>{user.username}</strong></span>}
          <button onClick={() => logout()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)' }}>
            Wyloguj
          </button>
        </div>
      </header>
      <main className="app-layout__content">
        <Outlet />
      </main>
      <UploadStatusBar />
    </div>
  );
}
