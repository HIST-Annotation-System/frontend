import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const SECTIONS = [
  { to: '/admin/users', label: 'Użytkownicy' },
  { to: '/admin/settings', label: 'Kategorie i grupy' },
  { to: '/admin/cell-types', label: 'Typy komórek' },
  { to: '/admin/tags', label: 'Tagi hotspotów' },
  { to: '/admin/storage', label: 'Magazyn' },
];

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <nav className="admin-nav" aria-label="Administracja">
        <h2 className="admin-nav__title">Administracja</h2>
        {SECTIONS.map((section) => (
          <NavLink key={section.to} to={section.to} className="admin-nav__item">
            {section.label}
          </NavLink>
        ))}
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
