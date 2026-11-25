import { useState, type ReactNode } from 'react';
import './SidebarSection.css';

interface SidebarSectionProps {
  title: string;
  /** Shown after the title, e.g. a count. */
  meta?: ReactNode;
  /** The title rolls the body up and down. */
  collapsible?: boolean;
  /** Whether a collapsible section starts unrolled. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A section of a side pane: a plain header strip over its body. */
export default function SidebarSection({
  title,
  meta,
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
      {meta != null && <span className="sidebar-section__meta">{meta}</span>}
    </>
  );

  return (
    <section className="sidebar-section">
      <header className="pane-strip">
        {collapsible ? (
          <button type="button" className="sidebar-section__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            {heading}
          </button>
        ) : (
          <h3 className="sidebar-section__title">{heading}</h3>
        )}
      </header>
      {isOpen && <div className="sidebar-section__body">{children}</div>}
    </section>
  );
}
