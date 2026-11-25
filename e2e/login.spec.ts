import { expect, request, test } from '@playwright/test';
import { env } from './env';
import { LoginPage } from './pages/LoginPage';

const INVALID_CREDENTIALS = 'Nieprawidłowa nazwa użytkownika lub hasło.';

test.describe('login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const [role, credentials, roleLabel] of [
    ['admin', env.admin, 'Administrator'],
    ['org admin', env.orgAdmin, 'Administrator organizacji'],
    ['annotator', env.annotator, 'Anotator'],
  ] as const) {
    test(`SCRUM-22: ${role} signs in and sees the app`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await login.signIn(credentials);
      await login.expectSignedIn();
      await expect(page).toHaveURL('/');
      await page.getByRole('button', { name: /Menu profilu/ }).click();
      await expect(page.getByRole('menu')).toContainText(roleLabel);
      await expect(page.getByRole('link', { name: 'Administracja' })).toHaveCount(role === 'annotator' ? 0 : 1);
    });
  }

  test('SCRUM-22: wrong password shows an error and stays on the login page', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn({ username: env.annotator.username, password: 'wrong-password' });
    await expect(page.getByRole('alert')).toHaveText(INVALID_CREDENTIALS);
    await expect(page).toHaveURL('/login');
  });

  test('SCRUM-22: unknown user shows the same error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn({ username: 'no-such-user', password: 'whatever-123' });
    await expect(page.getByRole('alert')).toHaveText(INVALID_CREDENTIALS);
  });

  test('SCRUM-22: empty fields are not submitted', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => request.url().includes('/auth/login') && requests.push(request.url()));
    await page.goto('/login');
    await page.getByRole('button', { name: 'Zaloguj się' }).click();
    await expect(page.getByLabel('Nazwa użytkownika')).toHaveJSProperty('validity.valueMissing', true);
    await expect(page).toHaveURL('/login');
    expect(requests).toEqual([]);
  });

  test('SCRUM-22: the password can be shown and hidden', async ({ page }) => {
    await page.goto('/login');
    const password = page.getByLabel('Hasło', { exact: true });
    await password.fill('secret-123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Pokaż hasło' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /Ukryj hasło/ }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });
});

test.describe('signed in', () => {
  test.use({ storageState: 'e2e/auth/annotator.json' });

  test('SCRUM-22: a signed-in user opening /login is sent to the app', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible();
  });
});

test.describe('signing out', () => {
  // Its own session: signing out revokes the refresh token, which the saved annotator session shares with other tests.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('SCRUM-22: signing out returns to the login page', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(env.annotator);
    await login.expectSignedIn();
    await page.getByRole('button', { name: /Menu profilu/ }).click();
    await page.getByRole('menuitem', { name: 'Wyloguj się' }).click();
    await expect(page).toHaveURL('/login');
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('SCRUM-22: after signing out, a copy of the refresh token no longer works', async () => {
    const baseURL = `${env.apiUrl.replace(/\/$/, '')}/`;
    const session = await request.newContext({ baseURL });
    expect((await session.post('auth/login', { data: env.annotator })).ok()).toBeTruthy();
    const refresh = (await session.storageState()).cookies.find((cookie) => cookie.name === 'refresh_token');
    expect(refresh, 'refresh_token cookie').toBeDefined();
    expect((await session.post('auth/logout')).ok()).toBeTruthy();

    const copy = await request.newContext({ baseURL });
    const response = await copy.post('auth/refresh', { headers: { Cookie: `refresh_token=${refresh!.value}` } });
    expect(response.status()).toBe(401);
    await Promise.all([session.dispose(), copy.dispose()]);
  });
});
