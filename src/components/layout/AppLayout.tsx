import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, LayoutGrid, LogOut, Microscope, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeProvider';
import { useDismiss } from '../../hooks/useDismiss';
import { isManager, ROLE_LABELS } from '../../utils/roles';
import BrandLogo from './BrandLogo';
import UploadStatusBar from './UploadStatusBar';
import './AppLayout.css';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  // The library tab also covers the slide viewer, which belongs to it.
  const slidesActive = pathname === '/' || pathname.startsWith('/slides/');

  const closeMenu = () => {
    setIsUserMenuOpen(false);
    menuTrigger.current?.focus();
  };
  useDismiss(isUserMenuOpen, menuRoot, () => setIsUserMenuOpen(false));

  const openMenu = () => {
    setIsUserMenuOpen(true);
    // The dropdown renders on the next frame: focus its first item then.
    requestAnimationFrame(() => menuRoot.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMenu();
      return;
    }
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const target = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    items[target]?.focus();
  };

  const displayName =
    user && (user.profile?.first_name || user.profile?.last_name)
      ? `${user.profile.first_name} ${user.profile.last_name}`
      : user?.username;

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <header className="app-header">
        <div className="app-header__brand">
          <BrandLogo height={24} />
        </div>
        <nav className="app-header__nav" aria-label="Główna nawigacja">
          <NavLink
            to="/"
            className={`app-header__tab${slidesActive ? ' active' : ''}`}
            aria-current={slidesActive ? 'page' : undefined}
          >
            <Microscope size={16} aria-hidden="true" />
            Slajdy
          </NavLink>
          <NavLink to="/hotspots" className="app-header__tab">
            <LayoutGrid size={16} aria-hidden="true" />
            Hotspoty
          </NavLink>
          {isManager(user) && (
            <NavLink to="/admin" className="app-header__tab">
              <ShieldCheck size={16} aria-hidden="true" />
              Administracja
            </NavLink>
          )}
        </nav>

        <div className="app-header__actions">
          {user && (
            <div className="user-menu-container" ref={menuRoot}>
              <button
                ref={menuTrigger}
                type="button"
                id="user-menu-trigger"
                className={`user-menu-trigger${isUserMenuOpen ? ' user-menu-trigger--open' : ''}`}
                onClick={() => (isUserMenuOpen ? closeMenu() : openMenu())}
                title="Rozwiń menu profilu"
                aria-label={`Menu profilu: ${displayName}`}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                <span className="user-menu-name">{displayName}</span>
                <ChevronDown size={14} className="user-menu-chevron" aria-hidden="true" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="user-menu-dropdown"
                  role="menu"
                  aria-labelledby="user-menu-trigger"
                  onKeyDown={onMenuKeyDown}
                >
                  <div className="user-menu-header">
                    <span className="user-menu-header__name">{displayName}</span>
                    <span className="user-menu-header__login">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>
                  <Link to="/profile" className="user-menu-item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                    <User size={14} aria-hidden="true" />
                    Mój profil
                  </Link>
                  <button type="button" role="menuitem" className="user-menu-item" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
                    {theme === 'dark' ? 'Motyw jasny' : 'Motyw ciemny'}
                  </button>
                  <span className="user-menu-separator" aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    className="user-menu-item user-menu-item--danger"
                  >
                    <LogOut size={14} aria-hidden="true" />
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <main id="main-content" className="app-layout__content" tabIndex={-1}>
        <Outlet />
      </main>
      <UploadStatusBar />
    </div>
  );
}
