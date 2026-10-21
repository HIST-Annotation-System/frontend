import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, type To } from 'react-router-dom';
import { useHeaderSlot } from '../../../components/layout/headerSlot';

interface ViewerHeaderProps {
  backTo: To;
  backLabel: string;
  /** What is open (name, breadcrumb, queue navigation), after the back link. */
  children?: ReactNode;
}

/** Context bar of a viewer screen: the way back, then what is being viewed. */
export default function ViewerHeader({ backTo, backLabel, children }: ViewerHeaderProps) {
  const slot = useHeaderSlot();
  const content = (
    <div className={`viewer-header${slot ? ' viewer-header--in-app-header' : ''}`}>
      <Link className="viewer-header__back" to={backTo}>
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Link>
      <span className="viewer-header__divider" aria-hidden="true" />
      {children}
    </div>
  );
  // Inside the compact app header when it offers a slot, as in the design; otherwise as its own bar.
  return slot ? createPortal(content, slot) : content;
}
