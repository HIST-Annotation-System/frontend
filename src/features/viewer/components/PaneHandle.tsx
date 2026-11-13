import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaneHandleProps {
  open: boolean;
  onToggle: () => void;
}

/** Tab on the right edge of the image that shows or hides the side pane. */
export default function PaneHandle({ open, onToggle }: PaneHandleProps) {
  const label = open ? 'Ukryj panel' : 'Pokaż panel';
  return (
    <button type="button" className={`pane-handle${open ? ' pane-handle--open' : ''}`} aria-label={label} title={label} aria-expanded={open} onClick={onToggle}>
      {open ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      {!open && <span className="pane-handle__label">Więcej informacji</span>}
    </button>
  );
}
