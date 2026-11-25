import { useState, type ReactNode } from 'react';
import './SidebarSection.css';

export interface BottomSection {
  title: string;
  /** Whether the section starts unrolled. */
  defaultOpen?: boolean;
  content: ReactNode;
}

/**
 * Accordion sections for the bottom of a side pane: each body rolls down under its own header.
 */
export default function BottomSections({ sections }: { sections: BottomSection[] }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(sections.filter((section) => section.defaultOpen).map((section) => section.title)),
  );
  const toggle = (title: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(title)) next.add(title);
      return next;
    });

  return (
    <div className="bottom-sections">
      {sections.map((section) => {
        const isOpen = open.has(section.title);
        return (
          <div key={section.title} className="sidebar-section">
            <header className="pane-strip">
              <button
                type="button"
                className="sidebar-section__toggle"
                aria-expanded={isOpen}
                onClick={() => toggle(section.title)}
              >
                <span className="sidebar-section__caret">{isOpen ? '▾' : '▸'}</span>
                {section.title}
              </button>
            </header>
            {isOpen && <div className="sidebar-section__body">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
