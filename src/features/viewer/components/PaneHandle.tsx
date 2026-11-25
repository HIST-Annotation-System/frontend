import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaneHandleProps {
  open: boolean;
  onToggle: () => void;
  /** Written on the tab while the pane is hidden. */
  label?: string;
}

/** Tab on the right edge of the image that shows or hides the side pane. */
export default function PaneHandle({ open, onToggle, label = 'Więcej informacji' }: PaneHandleProps) {
  const action = open ? 'Ukryj panel' : 'Pokaż panel';
  return (
    <button type="button" className={`pane-handle${open ? ' pane-handle--open' : ''}`} aria-label={action} title={action} aria-expanded={open} onClick={onToggle}>
      {open ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      {!open && <span className="pane-handle__label">{label}</span>}
    </button>
  );
}
