import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { markLegacyHotspot } from './helpers/db';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';
import { HotspotViewerPage } from './pages/HotspotViewerPage';

test.use({ storageState: 'e2e/auth/annotator.json' });

let admin: Api;
let annotator: Api;
let folder: SeededFolder;
let hotspotId: string;

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  annotator = await Api.as(env.annotator);
});

test.beforeEach(async () => {
  folder = await seedFolder(admin, [unique('legacy')], await admin.e2eOrganizationId());
  hotspotId = folder.hotspots[0].id;
  await markLegacyHotspot(hotspotId);
});

test.afterEach(async ({ page }) => {
  await page.close();
  await removeFolder(admin, folder);
});

test.afterAll(async () => {
  await admin.dispose();
  await annotator.dispose();
});

const reannotatedAt = async () =>
  (await annotator.get<{ reannotated_at: string | null }>(`hotspots/${hotspotId}`)).reannotated_at;

test.describe('hotspots annotated the old, shared way', () => {
  test('SCRUM-81: there is no layer to start, the drawing tools are available at once', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await expect(page.getByRole('button', { name: 'Rozpocznij reannotację' })).toHaveCount(0);
    await expect(viewer.toolbar()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Oznacz jako poprawione' })).toBeVisible();
  });

  test('SCRUM-87: a hotspot is marked as corrected by hand, and the mark can be taken back', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    expect(await reannotatedAt()).toBeNull();

    await page.getByRole('button', { name: 'Oznacz jako poprawione' }).click();
    await expect(page.getByRole('button', { name: 'Cofnij „poprawione”' })).toBeVisible();
    await expect.poll(reannotatedAt).not.toBeNull();

    await page.getByRole('button', { name: 'Cofnij „poprawione”' }).click();
    await expect(page.getByRole('button', { name: 'Oznacz jako poprawione' })).toBeVisible();
    await expect.poll(reannotatedAt).toBeNull();
  });

  test('SCRUM-87: a hotspot marked as corrected is listed under "Poprawione"', async ({ page }) => {
    expect((await annotator.ctx.patch(`hotspots/${hotspotId}`, { data: { reannotated: true } })).ok()).toBeTruthy();
    await page.goto(`/hotspots?folder=${folder.id}&mode=reannotate`);
    const status = page.getByRole('combobox', { name: 'Status oceny' });
    await status.selectOption({ label: 'Poprawione' });
    await expect(page.getByRole('list').getByRole('link', { name: folder.hotspots[0].name, exact: true })).toBeVisible();
    await status.selectOption({ label: 'Do reannotacji' });
    await expect(page.getByRole('list').getByRole('link', { name: folder.hotspots[0].name, exact: true })).toHaveCount(0);
  });
});
