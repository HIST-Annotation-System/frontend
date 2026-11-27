import { expect, test, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { markSegmentationDone } from './helpers/db';
import { removeFolder, seedFolder } from './helpers/hotspots';
import { dialogTitled } from './helpers/ui';

test.use({ storageState: 'e2e/auth/admin.json' });

let admin: Api;
// Names of everything a test creates (through the UI or the API), removed afterwards by name.
let created: { organizations: string[]; cellTypes: string[]; tags: string[] };

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  created = { organizations: [], cellTypes: [], tags: [] };
});

test.afterEach(async () => {
  for (const organization of await admin.get<{ id: number; name: string }[]>('organizations/')) {
    if (created.organizations.includes(organization.name)) {
      for (const user of await admin.get<{ id: number; organization: { id: number } | null }[]>('users/')) {
        if (user.organization?.id === organization.id) await admin.deleteUser(user.id);
      }
      await admin.ctx.delete(`organizations/${organization.id}`);
    }
  }
  for (const type of await admin.get<{ id: number; name: string }[]>('cell-types/')) {
    if (created.cellTypes.includes(type.name)) await admin.ctx.delete(`cell-types/${type.id}`);
  }
  for (const tag of await admin.get<{ id: number; name: string }[]>('tags/')) {
    if (created.tags.includes(tag.name)) await admin.ctx.delete(`tags/${tag.id}`);
  }
});

test.afterAll(async () => {
  await admin.dispose();
});

const row = (page: Page, name: string) => page.getByRole('row', { name: new RegExp(name) });

test.describe('organizations', () => {
  test('SCRUM-29: creates an organization that starts empty', async ({ page }) => {
    const name = unique('org');
    created.organizations.push(name);
    await page.goto('/admin/organizations');
    await page.getByRole('textbox', { name: 'Nazwa nowej organizacji' }).fill(name);
    await page.getByRole('button', { name: 'Dodaj', exact: true }).click();
    await expect(row(page, name)).toContainText('brak');
    await expect(row(page, name).getByRole('cell').nth(1)).toHaveText('0');
  });

  test('SCRUM-29: an existing name cannot be added again', async ({ page }) => {
    await page.goto('/admin/organizations');
    await page.getByRole('textbox', { name: 'Nazwa nowej organizacji' }).fill('E2E Organization');
    await expect(page.getByRole('button', { name: 'Dodaj', exact: true })).toBeDisabled();
  });

  test('SCRUM-29: the shortcut adds the first account of an organization as its administrator', async ({ page }) => {
    const name = unique('org-shortcut');
    const username = unique('first-admin');
    created.organizations.push(name);
    await admin.createOrganization(name);
    await page.goto('/admin/organizations');
    await expect(row(page, name)).toContainText('brak');
    await page.getByRole('button', { name: `Dodaj użytkownika do organizacji ${name}` }).click();
    const dialog = dialogTitled(page, 'Dodaj użytkownika');
    await expect(dialog.getByLabel('Rola')).toHaveValue('ORG_ADMIN');
    await expect(dialog.getByLabel('Organizacja')).toContainText(name);
    await dialog.getByLabel('Nazwa użytkownika').fill(username);
    await dialog.getByLabel('Hasło tymczasowe').fill('Start-pass-1');
    await dialog.getByRole('button', { name: 'Utwórz konto' }).click();
    await expect(dialog).toBeHidden();
    await expect(row(page, name)).toContainText('istnieje');
    await expect(row(page, name).getByRole('cell').nth(1)).toHaveText('1');
    const account = (await admin.get<{ username: string; role: string }[]>('users/')).find((item) => item.username === username);
    expect(account?.role).toBe('ORG_ADMIN');
  });

  test('SCRUM-29: deletes an empty organization after confirmation', async ({ page }) => {
    const name = unique('org-delete');
    created.organizations.push(name);
    await admin.createOrganization(name);
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: `Usuń organizację ${name}` }).click();
    await dialogTitled(page, 'Usuń organizację').getByRole('button', { name: 'Usuń' }).click();
    await expect(row(page, name)).toHaveCount(0);
  });

  test('SCRUM-29: refuses to delete an organization that still has accounts', async ({ page }) => {
    const name = unique('org-busy');
    created.organizations.push(name);
    const organization = await admin.createOrganization(name);
    await admin.createUser({ username: unique('member'), password: 'Start-pass-1', organizationId: organization.id });
    await page.goto('/admin/organizations');
    await page.getByRole('button', { name: `Usuń organizację ${name}` }).click();
    const dialog = dialogTitled(page, 'Usuń organizację');
    await dialog.getByRole('button', { name: 'Usuń' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Nie można usunąć');
    await dialog.getByRole('button', { name: 'Wróć' }).click();
    await expect(row(page, name)).toBeVisible();
  });
});

test.describe('cell types', () => {
  test('SCRUM-82: adds a cell type', async ({ page }) => {
    const name = unique('Type');
    created.cellTypes.push(name);
    await page.goto('/admin/cell-types');
    await page.getByRole('textbox', { name: 'Nazwa nowego typu komórki' }).fill(name);
    await page.getByRole('button', { name: 'Dodaj', exact: true }).click();
    await expect(row(page, name)).toBeVisible();
    expect((await admin.get<{ name: string }[]>('cell-types/')).map((type) => type.name)).toContain(name);
  });

  test('SCRUM-82: a name that differs only in letter case is a duplicate', async ({ page }) => {
    const name = unique('Dup');
    created.cellTypes.push(name);
    await admin.createCellType(name);
    await page.goto('/admin/cell-types');
    await page.getByRole('textbox', { name: 'Nazwa nowego typu komórki' }).fill(name.toUpperCase());
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dodaj', exact: true })).toBeDisabled();
  });

  test('SCRUM-82: renames a cell type', async ({ page }) => {
    const name = unique('Old');
    const renamed = unique('Renamed');
    created.cellTypes.push(name, renamed);
    await admin.createCellType(name);
    await page.goto('/admin/cell-types');
    await page.getByRole('button', { name: `Zmień nazwę typu ${name}` }).click();
    await page.getByRole('textbox', { name: 'Nazwa typu komórki' }).fill(renamed);
    await page.getByRole('button', { name: 'Zapisz' }).click();
    await expect(row(page, renamed)).toBeVisible();
    await expect(row(page, name)).toHaveCount(0);
  });

  test('SCRUM-82: deletes an unused cell type after confirmation', async ({ page }) => {
    const name = unique('Gone');
    created.cellTypes.push(name);
    await admin.createCellType(name);
    await page.goto('/admin/cell-types');
    await page.getByRole('button', { name: `Usuń typ komórki ${name}` }).click();
    await dialogTitled(page, 'Usuń typ komórki').getByRole('button', { name: 'Usuń' }).click();
    await expect(row(page, name)).toHaveCount(0);
  });

  test('SCRUM-82: a cell type used in an annotation cannot be deleted', async ({ page }) => {
    const name = unique('Used');
    created.cellTypes.push(name);
    const type = await admin.createCellType(name);
    const folder = await seedFolder(admin, [unique('used')], await admin.e2eOrganizationId());
    try {
      const hotspotId = folder.hotspots[0].id;
      const annotator = await Api.as(env.annotator);
      await markSegmentationDone(hotspotId);
      expect((await annotator.ctx.post(`hotspots/${hotspotId}/reannotation`)).ok()).toBeTruthy();
      const response = await annotator.ctx.post(`hotspots/${hotspotId}/annotations`, {
        data: {
          kind: 'cell',
          cell_type_id: type.id,
          geometry: { type: 'Polygon', coordinates: [[[1, 1], [20, 1], [20, 20], [1, 20], [1, 1]]] },
        },
      });
      expect(response.ok(), `annotation: ${response.status()} ${await response.text()}`).toBeTruthy();
      await annotator.dispose();

      await page.goto('/admin/cell-types');
      await page.getByRole('button', { name: `Usuń typ komórki ${name}` }).click();
      await dialogTitled(page, 'Usuń typ komórki').getByRole('button', { name: 'Usuń' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'używany w anotacjach' })).toBeVisible();
    } finally {
      await removeFolder(admin, folder);
    }
  });
});

test.describe('tags', () => {
  test('SCRUM-211: creates a custom tag with a weight', async ({ page }) => {
    const name = unique('tag');
    created.tags.push(name);
    await page.goto('/admin/tags');
    await page.getByRole('textbox', { name: 'Nazwa nowego tagu' }).fill(name);
    await page.getByRole('spinbutton', { name: 'Waga nowego tagu' }).fill('3');
    await page.getByRole('button', { name: 'Dodaj', exact: true }).click();
    await expect(row(page, name).getByRole('cell').nth(3)).toHaveText('3');
    await expect(row(page, name).getByRole('cell').nth(2)).toHaveText('Globalny');
    const tags = await admin.get<{ name: string; weight: number; dimension: string | null; organization_id: number | null }[]>(
      'tags/',
    );
    expect(tags.find((tag) => tag.name === name)).toMatchObject({ weight: 3, dimension: null, organization_id: null });
  });

  test('SCRUM-211: renames a custom tag', async ({ page }) => {
    const name = unique('tag-old');
    const renamed = unique('tag-new');
    created.tags.push(name, renamed);
    await admin.createTag(name, 2);
    await page.goto('/admin/tags');
    await page.getByRole('button', { name: `Zmień nazwę: ${name}` }).click();
    await page.getByRole('textbox', { name: 'Nazwa tagu' }).fill(renamed);
    await page.getByRole('button', { name: 'Zapisz' }).click();
    await expect(row(page, renamed)).toBeVisible();
    await expect(row(page, name)).toHaveCount(0);
  });

  test('SCRUM-211: deletes a custom tag after confirmation', async ({ page }) => {
    const name = unique('tag-gone');
    created.tags.push(name);
    await admin.createTag(name, 2);
    await page.goto('/admin/tags');
    await page.getByRole('button', { name: `Usuń tag ${name}` }).click();
    await dialogTitled(page, 'Usuń tag').getByRole('button', { name: 'Usuń' }).click();
    await expect(row(page, name)).toHaveCount(0);
  });

  test('SCRUM-211: the built-in ratings cannot be renamed or deleted', async ({ page }) => {
    await page.goto('/admin/tags');
    for (const rating of ['wysoka', 'średnia', 'niska', 'błędna', 'poprawna']) {
      await expect(page.getByRole('button', { name: `Zmień wagę: ${rating}` })).toBeVisible();
      await expect(page.getByRole('button', { name: `Usuń tag ${rating}` })).toHaveCount(0);
      await expect(page.getByRole('button', { name: `Zmień nazwę: ${rating}` })).toHaveCount(0);
    }
  });

  test('SCRUM-211: a custom tag heavier than the lightest rating is refused', async () => {
    const name = unique('tag-heavy');
    created.tags.push(name);
    const response = await admin.ctx.post('tags/', { data: { name, weight: 500 } });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
