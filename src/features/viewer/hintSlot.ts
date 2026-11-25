import { createContext } from 'react';

/** The status bar's hint slot (filled by the active tool's description), and the setter the bar registers it with. */
export const HintSlotContext = createContext<{ slot: HTMLElement | null; setSlot: (slot: HTMLElement | null) => void } | null>(
  null,
);
