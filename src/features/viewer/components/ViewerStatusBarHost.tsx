import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { StatusSlotContext } from '../statusSlot';

/** The viewer's status bar: in the screen-wide slot when the page offers one, otherwise under the canvas. */
export default function ViewerStatusBarHost({ children }: { children: ReactNode }) {
  const slot = useContext(StatusSlotContext);
  return slot ? createPortal(children, slot) : <div className="viewer-screen__status">{children}</div>;
}
