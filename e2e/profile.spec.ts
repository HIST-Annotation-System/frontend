import { expect, request, test } from '@playwright/test';
import { env } from './env';
import { Api, completeFirstLogin, unique } from './helpers/api';
import { LoginPage } from './pages/LoginPage';

test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD = 'Profile-pass-1';

let admin: Api;
let userId: number;
let credentials: { username: string; password: string };

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

// Each test gets its own finished account, so changing a password never touches the shared test accounts.
test.beforeEach(async ({ page }) => {
  credentials = { username: unique('profile'), password: PASSWORD };
  userId = (await admin.createUser({ ...credentials, organizationId: await admin.e2eOrganizationId() })).id;
  await completeFirstLogin(credentials, 'Anna', 'Nowak');
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn(credentials);
  await login.expectSignedIn();
  await page.goto('/profile');
});

test.afterEach(async () => {
  await admin.deleteUser(userId);
});

test.afterAll(async () => {
  await admin.dispose();
});

test('SCRUM-27: the profile shows the account and the personal data', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Mój profil' })).toBeVisible();
  const identity = page.getByRole('region', { name: 'Twoje konto' });
  await expect(identity).toContainText('Anna Nowak');
  await expect(identity).toContainText('Anotator');
  await expect(page.getByRole('definition').filter({ hasText: credentials.username })).toBeVisible();
  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await expect(page.getByText('Nowak', { exact: true })).toBeVisible();
});

test('SCRUM-27: the name can be changed and shows up in the menu', async ({ page }) => {
  await page.getByRole('button', { name: 'Edytuj' }).click();
  await page.getByLabel('Imię').fill('Ewa');
  await page.getByLabel('Nazwisko').fill('Zielińska');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu profilu: Ewa Zielińska' })).toBeVisible();
  const me = await (await Api.as(credentials)).get<{ profile: { first_name: string; last_name: string } }>('users/me');
  expect(me.profile).toMatchObject({ first_name: 'Ewa', last_name: 'Zielińska' });
});

test('SCRUM-27: cancelling an edit keeps the old name', async ({ page }) => {
  await page.getByRole('button', { name: 'Edytuj' }).click();
  await page.getByLabel('Imię').fill('Ktoś');
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await expect(page.getByText('Ktoś')).toHaveCount(0);
});

test('SCRUM-27: the password can be changed, and only the new one works', async ({ page }) => {
  const newPassword = 'Changed-pass-2';
  await page.getByRole('button', { name: 'Zmień hasło' }).click();
  await page.getByLabel('Nowe hasło').fill(newPassword);
  await page.getByLabel('Powtórz hasło').fill(newPassword);
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano')).toBeVisible();

  const withNew = await Api.as({ username: credentials.username, password: newPassword });
  await withNew.dispose();
  const anonymous = await request.newContext({ baseURL: `${env.apiUrl}/` });
  expect((await anonymous.post('auth/login', { data: credentials })).status()).toBe(401);
  await anonymous.dispose();
});

test('SCRUM-27: different passwords are refused with a message', async ({ page }) => {
  await page.getByRole('button', { name: 'Zmień hasło' }).click();
  await page.getByLabel('Nowe hasło').fill('Changed-pass-2');
  await page.getByLabel('Powtórz hasło').fill('Another-pass-3');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('alert')).toHaveText('Hasła nie są takie same.');
});

test('SCRUM-27: a password shorter than 8 characters is refused with a message', async ({ page }) => {
  await page.getByRole('button', { name: 'Zmień hasło' }).click();
  await page.getByLabel('Nowe hasło').fill('Ab1!');
  await page.getByLabel('Powtórz hasło').fill('Ab1!');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('alert')).toHaveText('Hasło musi mieć co najmniej 8 znaków.');
});
