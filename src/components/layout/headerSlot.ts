import { createContext, useContext } from 'react';

/** Element in the compact app header where a viewer screen renders its context (back link, breadcrumb). */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

export const useHeaderSlot = () => useContext(HeaderSlotContext);
