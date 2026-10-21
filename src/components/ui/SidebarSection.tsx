import { useState, type ReactNode } from 'react';
import './SidebarSection.css';

interface SidebarSectionProps {
  title?: string;
  /** Shown after the title in mono, e.g. a count. */
  meta?: ReactNode;
  actions?: ReactNode;
  grow?: boolean;
  compact?: boolean;
  /** The title rolls the body up and down. */
  collapsible?: boolean;
  /** Whether a collapsible section starts unrolled. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A docked panel with a plain header strip, stacked inside a side pane or inspector. */
export default function SidebarSection({
  title,
  meta,
  actions,
  grow = false,
  compact = false,
  collapsible = false,
  defaultOpen = true,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;
  const heading = (
    <>
      {collapsible && <span className="sidebar-section__caret">{open ? '▾' : '▸'}</span>}
      {title}
      {meta != null && <span className="sidebar-section__meta tabular">{meta}</span>}
    </>
  );

  return (
    <section className={`sidebar-section${grow && isOpen ? ' sidebar-section--grow' : ''}`}>
      {(title || actions) && (
        <header className="sidebar-section__header">
          {collapsible ? (
            <button
              type="button"
              className="sidebar-section__toggle label"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {heading}
            </button>
          ) : (
            title && <h3 className="sidebar-section__title label">{heading}</h3>
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
