import { expect, request, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { FirstLoginPage } from './pages/FirstLoginPage';
import { LoginPage } from './pages/LoginPage';

test.use({ storageState: { cookies: [], origins: [] } });

const TEMPORARY_PASSWORD = 'Start-pass-1';
const NEW_PASSWORD = 'New-pass-123!';

let admin: Api;
let createdIds: number[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  createdIds = [];
});

test.afterEach(async () => {
  for (const id of createdIds) await admin.deleteUser(id);
});

test.afterAll(async () => {
  await admin.dispose();
});

async function newAccount() {
  const username = unique('first');
  const account = await admin.createUser({
    username,
    password: TEMPORARY_PASSWORD,
    organizationId: await admin.e2eOrganizationId(),
  });
  createdIds.push(account.id);
  return { username, password: TEMPORARY_PASSWORD };
}

async function signInToSetup(page: import('@playwright/test').Page) {
  const account = await newAccount();
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn(account);
  await expect(page).toHaveURL('/setup');
  return { account, login, setup: new FirstLoginPage(page) };
}

test.describe('first login', () => {
  test('SCRUM-27: a new account is sent to the profile setup after signing in', async ({ page }) => {
    const { account, setup } = await signInToSetup(page);
    await setup.expectVisible();
    await expect(page.getByText(account.username)).toBeVisible();
  });

  test('SCRUM-27: a user who has not finished the setup cannot open the app', async ({ page }) => {
    await signInToSetup(page);
    await page.goto('/hotspots');
    await expect(page).toHaveURL('/setup');
  });

  test('SCRUM-27: filling in the profile and a new password opens the app', async ({ page }) => {
    const { account, login, setup } = await signInToSetup(page);
    await setup.fill({ firstName: 'Anna', lastName: 'Nowak', password: NEW_PASSWORD });
    await setup.submit();
    await login.expectSignedIn();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Menu profilu: Anna Nowak' })).toBeVisible();

    // The new password works, the temporary one does not.
    const withNew = await Api.as({ username: account.username, password: NEW_PASSWORD });
    await withNew.dispose();
    const anonymous = await request.newContext({ baseURL: `${env.apiUrl}/` });
    const rejected = await anonymous.post('auth/login', { data: account });
    expect(rejected.status()).toBe(401);
    await anonymous.dispose();
  });

  test('SCRUM-27: after the setup, /setup redirects to the app', async ({ page }) => {
    const { login, setup } = await signInToSetup(page);
    await setup.fill({ firstName: 'Jan', lastName: 'Kowalski', password: NEW_PASSWORD });
    await setup.submit();
    await login.expectSignedIn();
    await page.goto('/setup');
    await expect(page).toHaveURL('/');
  });

  test('SCRUM-27: different passwords are rejected with a message', async ({ page }) => {
    const { setup } = await signInToSetup(page);
    await setup.fill({ firstName: 'Jan', lastName: 'Kowalski', password: NEW_PASSWORD, confirm: 'Other-pass-123!' });
    await setup.submit();
    await expect(page.getByRole('alert')).toHaveText('Hasła nie pasują do siebie.');
    await expect(page).toHaveURL('/setup');
  });

  test('SCRUM-27: a password shorter than 8 characters is rejected with a message', async ({ page }) => {
    const { setup } = await signInToSetup(page);
    await setup.fill({ firstName: 'Jan', lastName: 'Kowalski', password: 'Ab1!' });
    await setup.submit();
    await expect(page.getByRole('alert')).toHaveText('Hasło musi mieć co najmniej 8 znaków.');
    await expect(page).toHaveURL('/setup');
  });
});

test.describe('account creation and setup through the API', () => {
  test('SCRUM-27: an already taken username is rejected', async () => {
    const account = await newAccount();
    const response = await admin.ctx.post('users/', {
      data: { username: account.username, password: TEMPORARY_PASSWORD, organization_id: await admin.e2eOrganizationId() },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    expect(await response.json()).toHaveProperty('detail');
  });

  test('SCRUM-27: the profile setup can be done only once', async () => {
    const user = await Api.as(await newAccount());
    const profile = { first_name: 'Jan', last_name: 'Kowalski' };
    const first = await user.ctx.post('auth/setup-profile', { data: { new_password: NEW_PASSWORD, ...profile } });
    expect(first.ok()).toBeTruthy();
    const second = await user.ctx.post('auth/setup-profile', { data: { new_password: 'Third-pass-123!', ...profile } });
    expect(second.status()).toBe(400);
    await user.dispose();
  });

  // The 8-character rule exists only in FirstLoginPage.tsx; the API takes any string (schemas/user.py ProfileSetup).
  test.fail('SCRUM-27: the API rejects a too short password', async () => {
    const user = await Api.as(await newAccount());
    const response = await user.ctx.post('auth/setup-profile', {
      data: { new_password: 'a', first_name: 'Jan', last_name: 'Kowalski' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    await user.dispose();
  });
});
