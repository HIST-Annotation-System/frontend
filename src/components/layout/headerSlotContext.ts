import { createContext } from 'react';

/** The app header element that viewer pages fill (see HeaderSlot). */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);
