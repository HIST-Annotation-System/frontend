import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import './SidebarSection.css';

interface SidebarSectionProps {
  title?: string;
  actions?: ReactNode;
  grow?: boolean;
  compact?: boolean;
  /** The title rolls the body up and down. */
  collapsible?: boolean;
  /** Whether a collapsible section starts unrolled. */
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function SidebarSection({
  title,
  actions,
  grow = false,
  compact = false,
  collapsible = false,
  defaultOpen = true,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;

  return (
    <section className={`sidebar-section${grow ? ' sidebar-section--grow' : ''}`}>
      {(title || actions) && (
        <header className="sidebar-section__header">
          {collapsible ? (
            <button
              type="button"
              className="sidebar-section__toggle label-caps"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {title}
            </button>
          ) : (
            title && <h3 className="label-caps">{title}</h3>
          )}
          {actions}
        </header>
      )}
      {isOpen && (
        <div className={`sidebar-section__body${compact ? ' sidebar-section__body--compact' : ''}`}>{children}</div>
      )}
    </section>
  );
}
