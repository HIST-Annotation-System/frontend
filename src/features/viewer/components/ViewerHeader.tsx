import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHeaderSlot } from '../../../components/layout/headerSlot';

interface ViewerHeaderProps {
  /** What is open (name, breadcrumb, queue navigation). */
  children?: ReactNode;
  /** Shows or hides the screen's right-hand panel, from the far end of the bar. */
  panel?: { open: boolean; onToggle: () => void };
}

/** Context bar of a viewer screen: what is being viewed, and the side panel toggle at the far end. */
export default function ViewerHeader({ children, panel }: ViewerHeaderProps) {
  const slot = useHeaderSlot();
  const content = (
    <div className={`viewer-header${slot ? ' viewer-header--in-app-header' : ''}`}>
      {children}
      {panel && (
        <button type="button" className="viewer-header__panel-toggle" onClick={panel.onToggle}>
          {panel.open ? 'Ukryj panel' : 'Pokaż panel'}
        </button>
      )}
    </div>
  );
  // Inside the compact app header when it offers a slot, as in the design; otherwise as its own bar.
  return slot ? createPortal(content, slot) : content;
}
