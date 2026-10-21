import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeProvider';
import { HeaderSlotContext } from './headerSlotContext';
import UploadStatusBar from './UploadStatusBar';
import './AppLayout.css';

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) return null;

  return (
    <div className="app-header__menu" ref={ref}>
      <button type="button" className="app-header__button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {user.username} ▾
      </button>
      {open && (
        <div className="app-header__dropdown" role="menu">
          <Link to="/profile" role="menuitem" className="app-header__item" onClick={() => setOpen(false)}>
            Mój profil
          </Link>
          <button type="button" role="menuitem" className="app-header__item app-header__item--danger" onClick={logout}>
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const slideViewer = useMatch('/slides/:slideId');
  const hotspotViewer = useMatch('/hotspots/:hotspotId');
  const inViewer = Boolean(slideViewer || hotspotViewer);

  return (
    <div className="app-layout">
      <header className="app-header">
        {/* TODO: swap the text for the HistAno SVG wordmark. */}
        <Link to="/" className="app-header__brand">
          HistAno
        </Link>
        {!inViewer && (
          <nav className="app-header__nav" aria-label="Sekcje">
            <NavLink to="/" end className="app-header__tab">
              Slajdy
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
        <div className="app-header__slot" ref={setSlot} />
        <button type="button" className="app-header__button" onClick={toggleTheme}>
          {theme === 'dark' ? 'Jasny motyw' : 'Ciemny motyw'}
        </button>
        <UserMenu />
      </header>
      <main className="app-layout__content">
        <HeaderSlotContext.Provider value={slot}>
          <Outlet />
        </HeaderSlotContext.Provider>
      </main>
      <UploadStatusBar />
    </div>
  );
}
