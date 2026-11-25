import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';

test.use({ storageState: 'e2e/auth/annotator.json' });

let admin: Api;
let folders: SeededFolder[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  folders = [];
});

test.afterEach(async () => {
  for (const folder of folders) await removeFolder(admin, folder);
});

test.afterAll(async () => {
  await admin.dispose();
});

async function seed(names: string[], organizationId?: number) {
  const folder = await seedFolder(admin, names, organizationId ?? (await admin.e2eOrganizationId()));
  folders.push(folder);
  return folder;
}

const hotspotLink = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('list').getByRole('link', { name, exact: true });

test.describe('hotspot catalogue', () => {
  test('SCRUM-78: lists the hotspots of the annotator\'s organization with the folder counts', async ({ page }) => {
    const name = unique('cat');
    const folder = await seed([`${name}-a`, `${name}-b`]);
    await page.goto('/hotspots');
    await expect(page.getByRole('button', { name: `${folder.name} 2` })).toBeVisible();
    await expect(hotspotLink(page, `${name}-a`)).toBeVisible();
    await expect(hotspotLink(page, `${name}-b`)).toBeVisible();
  });

  test('SCRUM-78: choosing a folder shows only its hotspots', async ({ page }) => {
    const first = await seed([unique('one')]);
    const second = await seed([unique('two')]);
    await page.goto('/hotspots');
    await page.getByRole('button', { name: `${first.name} 1` }).click();
    await expect(page.getByRole('heading', { name: first.name, level: 1 })).toBeVisible();
    await expect(hotspotLink(page, first.hotspots[0].name)).toBeVisible();
    await expect(hotspotLink(page, second.hotspots[0].name)).toHaveCount(0);
  });

  test('SCRUM-78: the search box narrows the list by name', async ({ page }) => {
    const name = unique('find');
    const folder = await seed([`${name}-wanted`, `${name}-other`]);
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('searchbox', { name: 'Szukaj hotspotu' }).fill('wanted');
    await expect(hotspotLink(page, `${name}-wanted`)).toBeVisible();
    await expect(hotspotLink(page, `${name}-other`)).toHaveCount(0);
  });

  test('SCRUM-79: sorting by date added puts the newest first and the direction can be flipped', async ({ page }) => {
    const name = unique('order');
    const folder = await seed([`${name}-1`, `${name}-2`, `${name}-3`]);
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('combobox', { name: 'Sortuj według' }).selectOption({ label: 'Data dodania' });
    const names = page.getByRole('list').getByRole('link');
    await expect(names).toHaveText([`${name}-3`, `${name}-2`, `${name}-1`]);
    await page.getByRole('button', { name: /Kierunek sortowania/ }).click();
    await expect(names).toHaveText([`${name}-1`, `${name}-2`, `${name}-3`]);
  });

  test('SCRUM-78: selecting a hotspot shows its details', async ({ page }) => {
    const name = unique('detail');
    const folder = await seed([name]);
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('checkbox', { name: `Zaznacz hotspot ${name}` }).check();
    const panel = page.getByRole('complementary', { name: `Szczegóły hotspotu ${name}` });
    await expect(panel).toContainText('Wgrany obraz');
    await expect(panel).toContainText(folder.name);
    await expect(panel).toContainText('Nieocenione');
  });

  test('SCRUM-78: hotspots of another organization are not listed', async ({ page }) => {
    const other = await admin.createOrganization(unique('other-org'));
    try {
      const foreign = await seed([unique('foreign')], other.id);
      const own = await seed([unique('own')]);
      await page.goto('/hotspots');
      await expect(hotspotLink(page, own.hotspots[0].name)).toBeVisible();
      await expect(hotspotLink(page, foreign.hotspots[0].name)).toHaveCount(0);
      await expect(page.getByRole('button', { name: new RegExp(foreign.name) })).toHaveCount(0);
    } finally {
      for (const folder of folders) await removeFolder(admin, folder);
      folders = [];
      await admin.deleteOrganization(other.id);
    }
  });

  test('SCRUM-81: opening a hotspot shows the annotation view with its position in the queue', async ({ page }) => {
    const name = unique('queue');
    const folder = await seed([`${name}-1`, `${name}-2`, `${name}-3`]);
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('combobox', { name: 'Sortuj według' }).selectOption({ label: 'Data dodania' });
    await hotspotLink(page, `${name}-2`).click();
    // The app keeps the folder and sort in the query string, so compare the path only.
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/hotspots/${folder.hotspots[1].id}`);
    await expect(page.getByRole('navigation', { name: 'Ścieżka' })).toContainText(folder.name);
    await expect(page.getByRole('navigation', { name: 'Kolejka hotspotów' })).toContainText('2 / 3');
    await page.getByRole('link', { name: 'Następny hotspot z listy' }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/hotspots/${folder.hotspots[0].id}`);
    await expect(page.getByRole('navigation', { name: 'Kolejka hotspotów' })).toContainText('3 / 3');
  });
});
