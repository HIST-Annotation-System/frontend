import type { Page } from '@playwright/test';

// The app's dialogs are named by their title (Modal.tsx, aria-labelledby).
export const dialogTitled = (page: Page, title: string) => page.getByRole('dialog', { name: title });
