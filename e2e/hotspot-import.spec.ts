import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, completeFirstLogin, unique } from './helpers/api';
import { removeFolder, type SeededFolder } from './helpers/hotspots';
import { dialogTitled } from './helpers/ui';

test.use({ storageState: 'e2e/auth/annotator.json' });

const PNG = readFileSync('e2e/fixtures/hotspot.png');
const JPEG = readFileSync('e2e/fixtures/hotspot.jpg');

let admin: Api;
let folder: SeededFolder;
let createdFolderNames: string[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(async () => {
  createdFolderNames = [];
  const created = await admin.createFolder(unique('import'), await admin.e2eOrganizationId());
  folder = { id: created.id, name: created.name, hotspots: [] };
});

test.afterEach(async ({ page }) => {
  await page.close();
  await removeFolder(admin, folder);
  for (const item of await admin.get<{ id: string; name: string }[]>('hotspot-folders')) {
    if (createdFolderNames.includes(item.name)) await removeFolder(admin, { id: item.id, name: item.name, hotspots: [] });
  }
});

test.afterAll(async () => {
  await admin.dispose();
});

// The rename and delete buttons of a folder only appear while the pointer is over its row.
const revealFolderActions = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}`) }).hover();

const hotspotsIn = (folderId: string) =>
  admin.get<{ id: string; name: string; image_type: string }[]>(`hotspots?folder_id=${folderId}`);

test.describe('importing hotspot images', () => {
  // The annotator has no upload permission; an organization's admin may always upload.
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  test('SCRUM-77: PNG and JPEG files become hotspots named after the files', async ({ page }) => {
    const name = unique('img');
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.locator('input[type=file]').first().setInputFiles([
      { name: `${name}-a.png`, mimeType: 'image/png', buffer: PNG },
      { name: `${name}-b.jpg`, mimeType: 'image/jpeg', buffer: JPEG },
    ]);
    await expect(page.getByRole('status').filter({ hasText: 'Wgrano 2 z 2' })).toBeVisible();
    await expect(page.getByRole('list').getByRole('link', { name: `${name}-a`, exact: true })).toBeVisible();
    await expect(page.getByRole('list').getByRole('link', { name: `${name}-b`, exact: true })).toBeVisible();

    const saved = await hotspotsIn(folder.id);
    expect(saved.map((item) => [item.name, item.image_type]).sort()).toEqual([
      [`${name}-a`, 'png'],
      [`${name}-b`, 'jpeg'],
    ]);
  });

  test('SCRUM-77: files of another type are skipped and reported', async ({ page }) => {
    const name = unique('mixed');
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.locator('input[type=file]').first().setInputFiles([
      { name: `${name}.png`, mimeType: 'image/png', buffer: PNG },
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
    ]);
    await expect(page.getByRole('status').filter({ hasText: 'Wgrano 1 z 1. Pominięto pliki innego typu: 1.' })).toBeVisible();
    expect((await hotspotsIn(folder.id)).map((item) => item.name)).toEqual([name]);
  });

  test('SCRUM-77: a file that only claims to be an image is refused and nothing is saved', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.locator('input[type=file]').first().setInputFiles([
      { name: `${unique('fake')}.png`, mimeType: 'image/png', buffer: Buffer.from('this is not a png') },
    ]);
    await expect(page.getByRole('status').filter({ hasText: /Wgrano 0 z 1/ })).toBeVisible();
    expect(await hotspotsIn(folder.id)).toEqual([]);
  });
});

test.describe('the upload permission', () => {
  test('SCRUM-77: an annotator without the upload permission cannot import', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await expect(page.getByRole('heading', { name: folder.name, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wgraj' })).toHaveCount(0);
  });

  test('SCRUM-77: the API refuses an upload from an account without the upload permission', async () => {
    const annotator = await Api.as(env.annotator);
    const response = await annotator.ctx.post(`hotspot-folders/${folder.id}/images`, {
      multipart: { file: { name: `${unique('api')}.png`, mimeType: 'image/png', buffer: PNG } },
    });
    expect(response.status()).toBe(403);
    expect(await hotspotsIn(folder.id)).toEqual([]);
    await annotator.dispose();
  });

  test('SCRUM-77: an annotator with the upload permission can import', async () => {
    const credentials = { username: unique('uploader'), password: 'Start-pass-1' };
    const account = await admin.createUser({ ...credentials, organizationId: await admin.e2eOrganizationId(), canUpload: true });
    try {
      await completeFirstLogin(credentials);
      const uploader = await Api.as(credentials);
      const name = unique('allowed');
      await uploader.uploadHotspot(folder.id, { name: `${name}.png`, mimeType: 'image/png', buffer: PNG });
      expect((await hotspotsIn(folder.id)).map((item) => item.name)).toEqual([name]);
      await uploader.dispose();
    } finally {
      await admin.deleteUser(account.id);
    }
  });
});

test.describe('folders', () => {
  test('SCRUM-77: creates a folder', async ({ page }) => {
    const name = unique('new-folder');
    createdFolderNames.push(name);
    await page.goto('/hotspots');
    await page.getByRole('button', { name: 'Nowy folder' }).click();
    await page.getByRole('textbox', { name: 'Nazwa nowego folderu' }).fill(name);
    await page.getByRole('button', { name: 'Utwórz folder' }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
    expect((await admin.get<{ name: string }[]>('hotspot-folders')).map((item) => item.name)).toContain(name);
  });

  test('SCRUM-77: renames a folder', async ({ page }) => {
    const renamed = unique('renamed');
    createdFolderNames.push(renamed);
    await page.goto('/hotspots');
    await revealFolderActions(page, folder.name);
    await page.getByRole('button', { name: `Zmień nazwę folderu ${folder.name}` }).click();
    await page.getByRole('textbox', { name: 'Nazwa folderu' }).fill(renamed);
    await page.getByRole('button', { name: 'Zapisz nazwę' }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${renamed}`) })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^${folder.name}`) })).toHaveCount(0);
  });

  test('SCRUM-77: deleting a folder removes it with its hotspots after confirmation', async ({ page }) => {
    await admin.uploadHotspot(folder.id, { name: `${unique('doomed')}.png`, mimeType: 'image/png', buffer: PNG });
    await page.goto('/hotspots');
    await revealFolderActions(page, folder.name);
    await page.getByRole('button', { name: `Usuń folder ${folder.name}` }).click();
    const dialog = dialogTitled(page, 'Usuń folder');
    await expect(dialog).toContainText('(1)');
    await dialog.getByRole('button', { name: 'Usuń', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${folder.name}`) })).toHaveCount(0);
    expect((await admin.get<{ id: string }[]>('hotspot-folders')).map((item) => item.id)).not.toContain(folder.id);
  });

  test('SCRUM-77: going back from the delete dialog keeps the folder', async ({ page }) => {
    await page.goto('/hotspots');
    await revealFolderActions(page, folder.name);
    await page.getByRole('button', { name: `Usuń folder ${folder.name}` }).click();
    await dialogTitled(page, 'Usuń folder').getByRole('button', { name: 'Wróć' }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${folder.name}`) })).toBeVisible();
  });
});
