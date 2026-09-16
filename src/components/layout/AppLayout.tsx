import { useState } from 'react';
import { Microscope } from 'lucide-react';
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            <Microscope size={18} />
          </span>
          <span className="app-header__title">Cancer Cell Annotator (WSI)</span>
        </Link>
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
          
          {user?.role === 'ADMIN' ? (
            <NavLink to="/admin/users" className="app-header__tab">
              Administracja
            </NavLink>
          ) : (
            <PlaceholderTab label="Administracja" />
          )}
          
        </nav>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '1rem' }}>
          {user && (
            <div className="user-menu-container">
              <div className="user-menu-info">
                <span className="user-menu-name">
                  {user.profile?.first_name || user.profile?.last_name
                    ? `${user.profile.first_name} ${user.profile.last_name}`
                    : user.username}
                </span>
                <span className="user-menu-role">{user.role}</span>
              </div>
              <button 
                className="user-menu-avatar"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                title="Rozwiń menu profilu"
              >
                {user.profile?.first_name 
                  ? `${user.profile.first_name.charAt(0)}${user.profile.last_name?.charAt(0) || ''}`.toUpperCase()
                  : user.username.substring(0, 2).toUpperCase()}
              </button>
              
              {isUserMenuOpen && (
                <div className="user-menu-dropdown">
                  <Link to="/profile" className="user-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                    Mój Profil
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link to="/admin/users" className="user-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                      Panel Administratora
                    </Link>
                  )}
                  <button onClick={() => { logout(); setIsUserMenuOpen(false); }} className="user-menu-item text-danger">
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
