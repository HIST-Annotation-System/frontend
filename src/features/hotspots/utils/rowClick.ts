import type { MouseEvent } from 'react';

/** Clicks on the row's own controls (name link, checkbox, actions, dialogs) do not open the details. */
export function isRowControl(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as Element;
  return !event.currentTarget.contains(target) || target.closest('a, button, input, select, label, [role="menu"]') !== null;
}
