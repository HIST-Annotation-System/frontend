import { NavLink, Outlet } from 'react-router-dom';
import { Users, Settings } from 'lucide-react';
import './AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Administracja</h2>
        </div>
        
        <nav className="admin-nav">
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>Użytkownicy</span>
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Ustawienia</span>
          </NavLink>
        </nav>
      </aside>
      
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
