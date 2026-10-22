import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { HintSlotContext } from '../hintSlot';

interface ViewerHintProps {
  text: string;
  /** A blocking state (e.g. over the limit), shown in red. */
  error?: boolean;
}

/** What the active tool does, at the start of the viewer's status bar. */
export default function ViewerHint({ text, error = false }: ViewerHintProps) {
  const slot = useContext(HintSlotContext)?.slot;
  if (!slot) return null;
  return createPortal(
    <span className={`viewer-status__hint${error ? ' viewer-status__hint--error' : ''}`} title={text}>
      {text}
    </span>,
    slot,
  );
}
