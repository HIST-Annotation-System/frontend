import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSystemAdmin } from '../../utils/roles';
import './AdminLayout.css';

// `systemOnly`: shared by every organization (or about all of them), so for the system admin only.
const GROUPS = [
  {
    label: 'Analiza',
    sections: [
      { to: '/admin/stats', label: 'Statystyki', systemOnly: true },
      { to: '/admin/agreement', label: 'Zgodność reannotacji', systemOnly: false },
    ],
  },
  {
    label: 'Ludzie',
    sections: [
      { to: '/admin/organizations', label: 'Organizacje', systemOnly: true },
      { to: '/admin/users', label: 'Użytkownicy', systemOnly: false },
    ],
  },
  {
    label: 'Słowniki',
    sections: [
      { to: '/admin/cell-types', label: 'Typy komórek', systemOnly: true },
      { to: '/admin/tags', label: 'Tagi hotspotów', systemOnly: true },
    ],
  },
];

export default function AdminLayout() {
  useDocumentTitle('Administracja');
  const { user } = useAuth();
  const system = isSystemAdmin(user);
  const groups = GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) => system || !section.systemOnly),
  })).filter((group) => group.sections.length > 0);

  return (
    <div className="admin-layout tone-soft">
      <aside className="admin-sidebar">
        <p className="admin-sidebar-title">
          Administracja
          {!system && user?.organization && <span>{user.organization.name}</span>}
        </p>

        <nav className="admin-nav" aria-label="Administracja">
          {groups.map((group) => (
            <div key={group.label} className="admin-nav-group" role="group" aria-label={group.label}>
              <span className="admin-nav-label label-caps" aria-hidden="true">
                {group.label}
              </span>
              {group.sections.map((section) => (
                <NavLink key={section.to} to={section.to} className="admin-nav-item">
                  {section.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
