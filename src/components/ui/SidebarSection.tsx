import type { ReactNode } from 'react';
import './SidebarSection.css';

interface SidebarSectionProps {
  title?: string;
  actions?: ReactNode;
  grow?: boolean;
  compact?: boolean;
  children: ReactNode;
}

export default function SidebarSection({ title, actions, grow = false, compact = false, children }: SidebarSectionProps) {
  return (
    <section className={`sidebar-section${grow ? ' sidebar-section--grow' : ''}`}>
      {(title || actions) && (
        <header className="sidebar-section__header">
          {title && <h3 className="label-caps">{title}</h3>}
          {actions}
        </header>
      )}
      <div className={`sidebar-section__body${compact ? ' sidebar-section__body--compact' : ''}`}>{children}</div>
    </section>
  );
}
