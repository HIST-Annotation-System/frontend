import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Shapes, Palette, Tags, HardDrive } from 'lucide-react';
import type { ReactNode } from 'react';
import { usersApi } from '../../services/usersApi';
import { dictionariesApi } from '../../services/dictionariesApi';
import { useCellTypes } from '../../features/annotations/hooks/useCellTypes';
import { useTags } from '../../features/hotspots/hooks/useTags';
import './AdminLayout.css';

function AdminNavItem({ to, icon, label, count }: { to: string; icon: ReactNode; label: string; count?: number }) {
  return (
    <NavLink to={to} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
      {icon}
      <span className="admin-nav-item__label">{label}</span>
      {count !== undefined && <span className="admin-nav-item__count">{count}</span>}
    </NavLink>
  );
}

export default function AdminLayout() {
  // Same query keys as the admin pages, so the sidebar counts share their cache.
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll() });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => dictionariesApi.getCategories() });
  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: () => dictionariesApi.getGroups() });
  const { data: cellTypes } = useCellTypes();
  const { data: tags } = useTags();

  const dictionaryCount = categories && groups ? categories.length + groups.length : undefined;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title label-caps">Administracja</h2>

        <nav className="admin-nav">
          <AdminNavItem to="/admin/users" icon={<Users size={16} />} label="Użytkownicy" count={users?.length} />
          <AdminNavItem to="/admin/settings" icon={<Shapes size={16} />} label="Kategorie i grupy" count={dictionaryCount} />
          <AdminNavItem to="/admin/cell-types" icon={<Palette size={16} />} label="Typy komórek" count={cellTypes?.length} />
          <AdminNavItem to="/admin/tags" icon={<Tags size={16} />} label="Tagi hotspotów" count={tags?.length} />
          <AdminNavItem to="/admin/storage" icon={<HardDrive size={16} />} label="Zarządzanie plikami" />
        </nav>
      </aside>

      <main className="admin-main">
        <div className="admin-main__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
