import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api } from './helpers/api';

const html = (page: import('@playwright/test').Page) => page.locator('html');

test.describe('theme', () => {
  test.use({ storageState: 'e2e/auth/annotator.json' });

  test('SCRUM-37: the theme can be switched and is remembered after a reload', async ({ page }) => {
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: /Menu profilu/ }).click();
    await page.getByRole('menuitem', { name: 'Motyw ciemny' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: /Menu profilu/ }).click();
    await page.getByRole('menuitem', { name: 'Motyw jasny' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('theme on the login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('SCRUM-37: the login page has a theme switch too', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Włącz ciemny motyw' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('unknown pages', () => {
  test.use({ storageState: 'e2e/auth/annotator.json' });

  test('SCRUM-22: an unknown address shows the not-found page with a way back', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Nie znaleziono strony' })).toBeVisible();
    await page.getByRole('link', { name: 'Wróć do biblioteki slajdów' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('priority weights', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });
  // One global setting: these tests must not run next to each other (nor next to a repeat of themselves).
  test.describe.configure({ mode: 'serial' });

  type Weights = { weights: Record<string, number> };
  let admin: Api;
  let original: Weights;

  test.beforeAll(async () => {
    admin = await Api.as(env.admin);
    original = await admin.get<Weights>('priority-weights/');
  });

  // The weights are one global setting, so every test puts them back.
  test.afterEach(async () => {
    await admin.ctx.patch('priority-weights/', { data: original });
  });

  test.afterAll(async () => {
    await admin.dispose();
  });

  test('SCRUM-79: the admin changes a weight and it is saved', async ({ page }) => {
    await page.goto('/admin/priority-weights');
    const save = page.getByRole('button', { name: 'Zapisz' });
    await expect(save).toBeDisabled();
    const entropy = page.getByRole('spinbutton', { name: /^Entropia/ });
    const newValue = original.weights.entropy === 0.5 ? 0.4 : 0.5;
    await entropy.fill(String(newValue));
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toBeDisabled();

    await page.reload();
    await expect(page.getByRole('spinbutton', { name: /^Entropia/ })).toHaveValue(String(newValue));
    expect((await admin.get<Weights>('priority-weights/')).weights.entropy).toBe(newValue);
  });

  test('SCRUM-79: a negative weight is refused by the API', async () => {
    const response = await admin.ctx.patch('priority-weights/', { data: { weights: { entropy: -1 } } });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('SCRUM-79: an org admin cannot change the weights', async () => {
    const orgAdmin = await Api.as(env.orgAdmin);
    expect((await orgAdmin.ctx.patch('priority-weights/', { data: { weights: { entropy: 0.9 } } })).status()).toBe(403);
    await orgAdmin.dispose();
  });
});
