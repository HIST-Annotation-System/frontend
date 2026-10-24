import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const SECTIONS = [
  { to: '/admin/stats', label: 'Statystyki' },
  { to: '/admin/users', label: 'Użytkownicy' },
  { to: '/admin/settings', label: 'Kategorie i grupy' },
  { to: '/admin/cell-types', label: 'Typy komórek' },
  { to: '/admin/tags', label: 'Tagi hotspotów' },
  { to: '/admin/storage', label: 'Magazyn' },
];

export default function AdminLayout() {
  return (
    <div className="admin-layout tone-soft">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title label-caps">Administracja</h2>

        <nav className="admin-nav" aria-label="Administracja">
          {SECTIONS.map((section) => (
            <NavLink key={section.to} to={section.to} className="admin-nav-item">
              {section.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
