import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSystemAdmin } from '../../utils/roles';
import './AdminLayout.css';

// `systemOnly`: shared by every organization (or about all of them), so for the system admin only.
const SECTIONS = [
  { to: '/admin/stats', label: 'Statystyki', systemOnly: true },
  { to: '/admin/organizations', label: 'Organizacje', systemOnly: true },
  { to: '/admin/users', label: 'Użytkownicy', systemOnly: false },
  { to: '/admin/settings', label: 'Kategorie', systemOnly: true },
  { to: '/admin/cell-types', label: 'Typy komórek', systemOnly: true },
  { to: '/admin/tags', label: 'Tagi hotspotów', systemOnly: true },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const sections = isSystemAdmin(user) ? SECTIONS : SECTIONS.filter((section) => !section.systemOnly);

  return (
    <div className="admin-layout tone-soft">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title label-caps">
          {isSystemAdmin(user) ? 'Administracja' : (user?.organization?.name ?? 'Administracja')}
        </h2>

        <nav className="admin-nav" aria-label="Administracja">
          {sections.map((section) => (
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
