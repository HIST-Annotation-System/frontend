import { Microscope } from 'lucide-react';
import { Link, NavLink, Outlet, useMatch } from 'react-router-dom';
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
          <PlaceholderTab label="Administracja" />
        </nav>
      </header>
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
