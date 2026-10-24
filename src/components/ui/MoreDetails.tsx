import { useState, type ReactNode } from 'react';
import './MoreDetails.css';

const OPEN_KEY = 'hist.moreDetailsOpen';

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Technical rows of a details panel, folded under one toggle so the panel shows what matters first. The choice
 * is remembered for every panel (slides and hotspots alike).
 */
export default function MoreDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(readOpen);

  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(OPEN_KEY, String(!open));
    } catch {
      // Not remembered, still works for this visit.
    }
  };

  return (
    <div className="more-details">
      <button type="button" className="more-details__toggle" aria-expanded={open} onClick={toggle}>
        <span className="more-details__caret" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        Szczegóły techniczne
      </button>
      {open && children}
    </div>
  );
}
