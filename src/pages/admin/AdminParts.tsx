import type { ReactNode } from 'react';

/** Placeholder rows while an admin table loads, so the page keeps its shape. */
export function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="admin-skeleton" aria-busy="true" aria-label="Wczytywanie…">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="admin-skeleton__row" style={{ width: `${92 - (index % 3) * 14}%` }} />
      ))}
    </div>
  );
}

interface AdminEmptyProps {
  icon: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
}

/** An empty list: what is missing, what to do about it. */
export function AdminEmpty({ icon, title, text, children }: AdminEmptyProps) {
  return (
    <div className="admin-empty">
      {icon}
      <span className="admin-empty__title">{title}</span>
      {text && <span className="admin-empty__text">{text}</span>}
      {children}
    </div>
  );
}
