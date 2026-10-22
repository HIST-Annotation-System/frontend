import { useEffect, useState } from 'react';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeProvider';
import BrandLogo from './BrandLogo';
import { HeaderSlotContext } from './headerSlot';
import UploadStatusBar from './UploadStatusBar';
import './AppLayout.css';

const ROLE_LABELS = { ADMIN: 'Administrator', ANNOTATOR: 'Anotator' } as const;

/** Viewer screens get the compact header so the image keeps as much height as possible. */
const COMPACT_ROUTE = /^\/(slides|hotspots)\/[^/]+/;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  const compact = COMPACT_ROUTE.test(pathname);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isUserMenuOpen]);

  const displayName =
    user && (user.profile?.first_name || user.profile?.last_name)
      ? `${user.profile.first_name} ${user.profile.last_name}`
      : user?.username;

  return (
    <div className={`app-layout${compact ? ' app-layout--compact' : ''}`}>
      <header className="app-header">
        <Link to="/" className="app-header__brand" aria-label="HistAno — Biblioteka slajdów">
          <BrandLogo height={compact ? 18 : 24} />
        </Link>
        {compact ? (
          <div ref={setHeaderSlot} className="app-header__slot" />
        ) : (
          <nav className="app-header__nav">
            <NavLink to="/" end className="app-header__tab">
              Biblioteka slajdów
            </NavLink>
            <NavLink to="/hotspots" className="app-header__tab">
              Hotspoty
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className="app-header__tab">
                Administracja
              </NavLink>
            )}
          </nav>
        )}
        <div className="app-header__actions">
          <div className="theme-switch" role="group" aria-label="Motyw">
            <button
              type="button"
              className={`theme-switch__option${theme === 'light' ? ' theme-switch__option--active' : ''}`}
              title="Motyw jasny"
              aria-label="Włącz jasny motyw"
              aria-pressed={theme === 'light'}
              onClick={() => theme !== 'light' && toggleTheme()}
            >
              <Sun size={14} />
            </button>
            <button
              type="button"
              className={`theme-switch__option${theme === 'dark' ? ' theme-switch__option--active' : ''}`}
              title="Motyw ciemny"
              aria-label="Włącz ciemny motyw"
              aria-pressed={theme === 'dark'}
              onClick={() => theme !== 'dark' && toggleTheme()}
            >
              <Moon size={14} />
            </button>
          </div>
          {user && (
            <>
              <span className="app-header__divider" aria-hidden="true" />
              <div className="user-menu-container">
                <button
                  type="button"
                  className={`user-menu-trigger${isUserMenuOpen ? ' user-menu-trigger--open' : ''}`}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  title="Rozwiń menu profilu"
                  aria-label={`Menu profilu: ${displayName}`}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <span className="user-menu-name">{displayName}</span>
                  <ChevronDown size={14} className="user-menu-chevron" aria-hidden="true" />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div className="user-menu-backdrop" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="user-menu-dropdown" role="menu">
                      <div className="user-menu-header">
                        <span className="user-menu-header__name">{displayName}</span>
                        <span className="user-menu-header__login">
                          {user.username} · {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </div>
                      <Link to="/profile" className="user-menu-item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                        Mój profil
                      </Link>
                      <span className="user-menu-separator" aria-hidden="true" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="user-menu-item"
                      >
                        Wyloguj się
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>
      <main className="app-layout__content">
        <HeaderSlotContext.Provider value={compact ? headerSlot : null}>
          <Outlet />
        </HeaderSlotContext.Provider>
      </main>
      <UploadStatusBar />
    </div>
  );
}
