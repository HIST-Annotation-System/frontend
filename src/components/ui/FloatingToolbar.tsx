import type { ReactNode } from 'react';
import './FloatingToolbar.css';

interface FloatingToolbarProps {
  label: string;
  children: ReactNode;
}

/** Vertical tool strip floating over the top-left corner of a full-bleed canvas (e.g. the slide viewer). */
export default function FloatingToolbar({ label, children }: FloatingToolbarProps) {
  return (
    <div className="floating-toolbar" role="toolbar" aria-label={label} aria-orientation="vertical">
      {children}
    </div>
  );
}
