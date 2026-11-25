import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { dialogTitled } from './helpers/ui';
import { UsersPage } from './pages/UsersPage';

const PASSWORD = 'Start-pass-1';

type Account = { id: number; username: string };

let admin: Api;
let usernames: string[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  usernames = [];
});

// Removes every account the test created, whether it came from the UI or the API.
test.afterEach(async () => {
  const accounts = await admin.get<Account[]>('users/');
  for (const account of accounts.filter((item) => usernames.includes(item.username))) {
    await admin.deleteUser(account.id);
  }
});

test.afterAll(async () => {
  await admin.dispose();
});

const track = (prefix: string) => {
  const username = unique(prefix);
  usernames.push(username);
  return username;
};

const findAccount = async (username: string) =>
  (await admin.get<(Account & { profile: { can_upload: boolean } | null })[]>('users/')).find(
    (item) => item.username === username,
  );

test.describe('as system admin', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  test('SCRUM-29: creates an annotator who waits for the first login', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('new-annotator');
    await users.goto();
    const dialog = await users.create({ username, password: PASSWORD });
    await expect(dialog).toBeHidden();
    const row = users.row(username);
    await expect(row).toContainText('Anotator');
    await expect(row).toContainText('Czeka na pierwsze logowanie');
    await expect(row).toContainText('E2E Organization');
    expect((await findAccount(username))?.profile?.can_upload).toBe(false);
  });

  test('SCRUM-29: the upload permission is saved with the account', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('uploader');
    await users.goto();
    await users.create({ username, password: PASSWORD, canUpload: true });
    await expect(users.row(username)).toContainText('tak');
    expect((await findAccount(username))?.profile?.can_upload).toBe(true);
  });

  test('SCRUM-27: a taken username is refused with a message and nothing is created', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('taken');
    await admin.createUser({ username, password: PASSWORD, organizationId: await admin.e2eOrganizationId() });
    await users.goto();
    const dialog = await users.create({ username, password: PASSWORD });
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(users.row(username)).toHaveCount(1);
  });

  test('SCRUM-29: edits the name of an account', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('rename');
    await admin.createUser({ username, password: PASSWORD, organizationId: await admin.e2eOrganizationId() });
    await users.goto();
    await page.getByRole('button', { name: `Edytuj użytkownika ${username}` }).click();
    const dialog = dialogTitled(page, `Edytuj użytkownika: ${username}`);
    await dialog.getByLabel('Imię').fill('Ewa');
    await dialog.getByLabel('Nazwisko').fill('Zielińska');
    await dialog.getByRole('button', { name: 'Zapisz zmiany' }).click();
    await expect(dialog).toBeHidden();
    await expect(users.row(username)).toContainText('Ewa Zielińska');
  });

  test('SCRUM-29: deletes an account after confirmation', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('delete-me');
    await admin.createUser({ username, password: PASSWORD, organizationId: await admin.e2eOrganizationId() });
    await users.goto();
    await page.getByRole('button', { name: `Usuń użytkownika ${username}` }).click();
    await dialogTitled(page, 'Usuń użytkownika').getByRole('button', { name: 'Usuń' }).click();
    await expect(users.row(username)).toHaveCount(0);
    expect(await findAccount(username)).toBeUndefined();
  });

  test('SCRUM-29: cancelling the delete keeps the account', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('keep-me');
    await admin.createUser({ username, password: PASSWORD, organizationId: await admin.e2eOrganizationId() });
    await users.goto();
    await page.getByRole('button', { name: `Usuń użytkownika ${username}` }).click();
    const dialog = dialogTitled(page, 'Usuń użytkownika');
    await dialog.getByRole('button', { name: 'Wróć' }).click();
    await expect(dialog).toBeHidden();
    await expect(users.row(username)).toBeVisible();
  });

  test('SCRUM-29: the search box narrows the list', async ({ page }) => {
    const users = new UsersPage(page);
    const wanted = track('findme');
    const other = track('other');
    const organizationId = await admin.e2eOrganizationId();
    await admin.createUser({ username: wanted, password: PASSWORD, organizationId });
    await admin.createUser({ username: other, password: PASSWORD, organizationId });
    await users.goto();
    await users.search(wanted);
    await expect(users.row(wanted)).toBeVisible();
    await expect(users.row(other)).toHaveCount(0);
  });
});

test.describe('as org admin', () => {
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  test('SCRUM-29: adds an annotator to their own organization only', async ({ page }) => {
    const users = new UsersPage(page);
    const username = track('org-annotator');
    await users.goto();
    const dialog = await users.openCreateDialog();
    await expect(dialog.getByLabel('Organizacja')).toHaveCount(0);
    await expect(dialog.getByLabel('Rola').getByRole('option')).toHaveText(['Anotator', 'Administrator organizacji']);
    await dialog.getByLabel('Nazwa użytkownika').fill(username);
    await dialog.getByLabel('Hasło tymczasowe').fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Utwórz konto' }).click();
    await expect(users.row(username)).toContainText('Czeka na pierwsze logowanie');
    const created = await admin.get<{ username: string; organization: { name: string } }[]>('users/');
    expect(created.find((item) => item.username === username)?.organization.name).toBe('E2E Organization');
  });

  test('SCRUM-29: does not see the organization column or other organizations', async ({ page }) => {
    await new UsersPage(page).goto();
    await expect(page.getByRole('columnheader', { name: 'Organizacja' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Filtr organizacji' })).toHaveCount(0);
  });

  test('SCRUM-29: cannot delete another org admin or change their own role', async () => {
    const orgAdmin = await Api.as(env.orgAdmin);
    const username = track('second-orgadmin');
    const colleague = await admin.createUser({
      username,
      password: PASSWORD,
      role: 'ORG_ADMIN',
      organizationId: await admin.e2eOrganizationId(),
    });
    expect((await orgAdmin.ctx.delete(`users/${colleague.id}`)).status()).toBe(403);

    const me = await orgAdmin.get<{ id: number }>('users/me');
    expect((await orgAdmin.ctx.put(`users/${me.id}`, { data: { role: 'ANNOTATOR' } })).status()).toBe(403);
    await orgAdmin.dispose();
  });
});
