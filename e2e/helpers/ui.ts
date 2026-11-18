import type { Page } from '@playwright/test';

// The app's <dialog> elements have no accessible name (the title is a plain heading), so find them by that heading.
export const dialogTitled = (page: Page, title: string) =>
  page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: title }) });
