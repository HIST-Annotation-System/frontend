import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HeaderSlotContext } from './headerSlotContext';

/** Renders its children into the app header (breadcrumb, prev/next) in place of the section tabs. */
export default function HeaderSlot({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  return slot ? createPortal(children, slot) : null;
}
