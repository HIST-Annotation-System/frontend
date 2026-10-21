import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ToolColumn.css';

interface ToolColumnProps {
  label: string;
  children: ReactNode;
}

/** Vertical tool strip docked to the left edge of a viewer canvas. */
export default function ToolColumn({ label, children }: ToolColumnProps) {
  return (
    <div className="tool-column" role="toolbar" aria-label={label} aria-orientation="vertical">
      {children}
    </div>
  );
}

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  /** Keyboard shortcut, shown in the tooltip. */
  shortcut?: string;
  active?: boolean;
}

export function ToolButton({ icon, label, shortcut, active, ...props }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`tool-column__button${active ? ' tool-column__button--active' : ''}`}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      {...props}
    >
      {icon}
    </button>
  );
}

export function ToolDivider() {
  return <hr className="tool-column__divider" />;
}
