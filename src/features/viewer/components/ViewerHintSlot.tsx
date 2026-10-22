import { useContext } from 'react';
import { HintSlotContext } from '../hintSlot';

/** Start of a status bar: the active tool's description (see ViewerHint), then a separator. */
export default function ViewerHintSlot() {
  const setSlot = useContext(HintSlotContext)?.setSlot;
  if (!setSlot) return null;
  return (
    <>
      <span className="viewer-status__slot" ref={setSlot} />
      <span className="viewer-status__sep" aria-hidden="true" />
    </>
  );
}
