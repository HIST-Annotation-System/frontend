import { createContext } from 'react';

/** Element under the whole viewer screen (canvas and side pane) where the viewer renders its status bar. */
export const StatusSlotContext = createContext<HTMLElement | null>(null);
