import { expect, test, type Locator, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { markSegmentationDone } from './helpers/db';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';

test.use({ storageState: 'e2e/auth/admin.json' });

// Every number on the page is global and other tests change them all the time, so the tests look for rows that carry
// a name only they use (a folder, a cell type, a tag) and check the figures of those.
let admin: Api;
let annotator: Api;
let folder: SeededFolder;
let cellType: { id: number; name: string };
let tag: { id: number; name: string };

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  annotator = await Api.as(env.annotator);
});

test.beforeEach(async () => {
  folder = await seedFolder(admin, [unique('stat-a'), unique('stat-b')], await admin.e2eOrganizationId());
  cellType = await admin.createCellType(unique('StatType'));
  tag = await admin.createTag(unique('stat-tag'), 2);
});

test.afterEach(async ({ page }) => {
  await page.close();
  await removeFolder(admin, folder);
  await expect(async () => {
    expect([204, 404]).toContain((await admin.ctx.delete(`cell-types/${cellType.id}`)).status());
  }).toPass({ timeout: 15_000 });
  await admin.ctx.delete(`tags/${tag.id}`);
});

test.afterAll(async () => {
  await admin.dispose();
  await annotator.dispose();
});

const section = (page: Page, title: string) =>
  page.locator('section, div').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).last();

// The figure of a bar row. Row names contain random digits, so a digit is never looked for in the whole row.
const figure = (row: Locator) => row.locator('.viz-bars__value');

async function annotateFirstHotspot() {
  const hotspotId = folder.hotspots[0].id;
  await markSegmentationDone(hotspotId);
  expect((await annotator.ctx.post(`hotspots/${hotspotId}/reannotation`)).ok()).toBeTruthy();
  const drawn = await annotator.ctx.post(`hotspots/${hotspotId}/annotations`, {
    data: {
      kind: 'cell',
      cell_type_id: cellType.id,
      geometry: { type: 'Polygon', coordinates: [[[1, 1], [20, 1], [20, 20], [1, 20], [1, 1]]] },
    },
  });
  expect(drawn.ok(), `annotation: ${drawn.status()}`).toBeTruthy();
  await admin.addHotspotTag(hotspotId, tag.id);
}

test.describe('statistics page', () => {
  test('SCRUM-158: shows the folders, cell types and tags with their own counts', async ({ page }) => {
    await annotateFirstHotspot();
    await page.goto('/admin/stats');
    await expect(page.getByRole('heading', { name: 'Statystyki' })).toBeVisible();
    await expect(section(page, 'Postęp folderów').getByRole('listitem').filter({ hasText: folder.name })).toContainText('2 hotspotów');
    await expect(figure(section(page, 'Anotacje według typu komórek').getByRole('listitem').filter({ hasText: cellType.name }))).toHaveText('1');
    await expect(figure(section(page, 'Tagi własne').getByRole('listitem').filter({ hasText: tag.name }))).toHaveText('1');
  });

  test('SCRUM-158: the annotator who drew a cell is listed with the work done', async ({ page }) => {
    await annotateFirstHotspot();
    await page.goto('/admin/stats');
    const row = page.getByRole('row').filter({ hasText: env.annotator.username });
    await expect(row).toContainText('Anotator');
    const stats = await admin.get<{ annotators: { username: string; annotations: number; in_progress: number }[] }>('stats/');
    const mine = stats.annotators.find((item) => item.username === env.annotator.username)!;
    expect(mine.annotations).toBeGreaterThanOrEqual(1);
    expect(mine.in_progress).toBeGreaterThanOrEqual(1);
  });

  test('SCRUM-160: the refresh button picks up what changed since the page was opened', async ({ page }) => {
    await page.goto('/admin/stats');
    await expect(section(page, 'Tagi własne')).toBeVisible();
    const row = section(page, 'Tagi własne').getByRole('listitem').filter({ hasText: tag.name });
    await expect(figure(row)).toHaveText('0');
    await admin.addHotspotTag(folder.hotspots[0].id, tag.id);
    await expect(figure(row)).toHaveText('0');
    await page.getByRole('button', { name: 'Odśwież' }).click();
    await expect(figure(row)).toHaveText('1');
  });

  test('SCRUM-159: a folder with unrated hotspots shows no progress yet', async ({ page }) => {
    await page.goto('/admin/stats');
    const item = section(page, 'Postęp folderów').getByRole('listitem').filter({ hasText: folder.name });
    await expect(item).toContainText('2 hotspotów');
    await expect(item).toContainText('0%');
  });

  test('SCRUM-157: the API returns the figures to system admins and to org admins for their organization', async () => {
    const stats = await admin.get<{ hotspots: Record<string, number>; folders: { name: string; untagged: number }[] }>('stats/');
    expect(stats.folders.find((item) => item.name === folder.name)).toMatchObject({ untagged: 2 });
    expect(Object.keys(stats.hotspots).sort()).toEqual(['reannotated', 'to_reannotate', 'untagged']);
    const orgAdmin = await Api.as(env.orgAdmin);
    const own = await orgAdmin.get<{ folders: { name: string; untagged: number }[] }>('stats/');
    expect(own.folders.find((item) => item.name === folder.name)).toMatchObject({ untagged: 2 });
    await orgAdmin.dispose();
  });
});
