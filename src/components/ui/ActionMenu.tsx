import { Ellipsis } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import Button from './Button';
import './ActionMenu.css';

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  /** Destructive: shown in red. */
  danger?: boolean;
  disabled?: boolean;
}

/** A "⋯" button that opens a short list of actions (the rarely used or risky ones next to a main button). */
export default function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));

  return (
    <div className="action-menu" ref={root}>
      <Button
        icon={<Ellipsis size={16} aria-hidden="true" />}
        aria-label="Więcej działań"
        title="Więcej działań"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div className="action-menu__list">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.danger ? 'action-menu__danger' : undefined}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
