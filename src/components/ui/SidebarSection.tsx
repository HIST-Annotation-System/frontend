import type { ReactNode } from 'react';
import './SidebarSection.css';

interface SidebarSectionProps {
  title: string;
  actions?: ReactNode;
  grow?: boolean;
  children: ReactNode;
}

export default function SidebarSection({ title, actions, grow = false, children }: SidebarSectionProps) {
  return (
    <section className={`sidebar-section${grow ? ' sidebar-section--grow' : ''}`}>
      <header className="sidebar-section__header">
        <h3 className="label-caps">{title}</h3>
        {actions}
      </header>
      <div className="sidebar-section__body">{children}</div>
    </section>
  );
}
