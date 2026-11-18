import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { markSegmentationDone } from './helpers/db';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';
import { HotspotViewerPage } from './pages/HotspotViewerPage';

test.use({ storageState: 'e2e/auth/annotator.json' });

type Annotation = {
  id: string;
  kind: 'cell' | 'excluded';
  cell_type_id: number | null;
  geometry: { type: string; coordinates: number[][][] };
  created_by_name: string | null;
};

let admin: Api;
let annotator: Api;
let folder: SeededFolder;
let hotspotId: string;
let cellTypes: { id: number; name: string }[];

// The viewer draws with the first cell type of the global list (sorted by name), and other tests create and delete
// types all the time. A type that sorts first and is never deleted keeps the drawing independent of them.
const DEFAULT_CELL_TYPE = '0 E2E default cell type';

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  annotator = await Api.as(env.annotator);
  const existing = await admin.get<{ name: string }[]>('cell-types/');
  // Another worker may create it at the same moment; a refused duplicate is fine.
  if (!existing.some((type) => type.name === DEFAULT_CELL_TYPE)) await admin.ctx.post('cell-types/', { data: { name: DEFAULT_CELL_TYPE } });
});

test.beforeEach(async () => {
  folder = await seedFolder(admin, [unique('annotate')], await admin.e2eOrganizationId());
  hotspotId = folder.hotspots[0].id;
  // Without the ML worker a hotspot stays "pending", and a pending one cannot be annotated in the UI.
  await markSegmentationDone(hotspotId);
  cellTypes = [await admin.createCellType(unique('Beta'))];
});

test.afterEach(async ({ page }) => {
  // Close the page first so a late autosave cannot race with the cleanup below.
  await page.close();
  await removeFolder(admin, folder);
  for (const type of cellTypes) {
    // A type in use cannot be deleted; it is free once the hotspot is gone, which can take a retry if S3 hiccups.
    await expect(async () => {
      expect([204, 404]).toContain((await admin.ctx.delete(`cell-types/${type.id}`)).status());
    }).toPass({ timeout: 15_000 });
  }
});

test.afterAll(async () => {
  await admin.dispose();
  await annotator.dispose();
});

const annotations = () => annotator.get<Annotation[]>(`hotspots/${hotspotId}/annotations`);

test.describe('annotating a hotspot', () => {
  test('SCRUM-81: starting the reannotation gives the annotator a drawing toolbar', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await expect(viewer.toolbar()).toHaveCount(0);
    await viewer.start();
    await expect(page.getByText('Poprawiasz własną warstwę')).toBeVisible();
    for (const tool of ['Nawigacja', 'Poligon', 'Krzywa', 'Rysowanie ręczne', 'Obszar wyłączony'] as const) {
      await expect(viewer.tool(tool)).toBeVisible();
    }
    expect(await annotations()).toEqual([]);
  });

  test('SCRUM-81: a polygon drawn on the canvas is saved with the annotation', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.drawRectangle();
    await viewer.expectAnnotations(1);

    await expect.poll(async () => (await annotations()).length).toBe(1);
    const [saved] = await annotations();
    expect(saved.kind).toBe('cell');
    expect(saved.geometry.type).toBe('Polygon');
    expect(saved.geometry.coordinates[0].length).toBeGreaterThanOrEqual(4);
    expect(saved.created_by_name).toBe(env.annotator.username);
    expect(saved.cell_type_id).not.toBeNull();
  });

  test('SCRUM-82: the cell type chosen for a drawn cell is saved with it', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.drawRectangle();
    await viewer.expectAnnotations(1);

    const beta = cellTypes[0];
    await viewer.selectedCard().getByLabel('Typ komórki zaznaczonej anotacji').selectOption({ label: beta.name });
    await expect.poll(async () => (await annotations())[0]?.cell_type_id).toBe(beta.id);
  });

  test('SCRUM-42: a curve can be drawn with the curve tool', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.drawRectangle('Krzywa');
    await viewer.expectAnnotations(1);
    await expect.poll(async () => (await annotations())[0]?.geometry.type).toBe('Polygon');
  });

  test('SCRUM-83: an excluded area is saved as such, without a cell type', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.tool('Obszar wyłączony').click();
    await viewer.drawRectangle();
    await expect.poll(async () => (await annotations()).length).toBe(1);
    const [saved] = await annotations();
    expect(saved.kind).toBe('excluded');
    expect(saved.cell_type_id).toBeNull();
  });

  test('SCRUM-42: a drawn outline can be deleted', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.drawRectangle();
    await viewer.expectAnnotations(1);
    await viewer.selectedCard().getByRole('button', { name: 'Usuń anotację' }).click();
    await viewer.expectAnnotations(0);
    await expect.poll(async () => (await annotations()).length).toBe(0);
  });

  test('SCRUM-42: undo takes back the last drawn outline', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.drawRectangle();
    await viewer.expectAnnotations(1);
    await viewer.tool('Nawigacja').click();
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click();
    await viewer.expectAnnotations(0);
    await expect.poll(async () => (await annotations()).length).toBe(0);
  });
});

test.describe('layers and cell types in the side panel', () => {
  test('SCRUM-31: layers and cell types are listed once there are annotations, and can be switched off and on', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    const beta = cellTypes[0];
    expect((await annotator.ctx.post(`hotspots/${hotspotId}/reannotation`)).ok()).toBeTruthy();
    const drawn = await annotator.ctx.post(`hotspots/${hotspotId}/annotations`, {
      data: {
        kind: 'cell',
        cell_type_id: beta.id,
        geometry: { type: 'Polygon', coordinates: [[[5, 5], [30, 5], [30, 30], [5, 30], [5, 5]]] },
      },
    });
    expect(drawn.ok(), `annotation: ${drawn.status()}`).toBeTruthy();

    await viewer.goto(hotspotId);
    await viewer.expectAnnotations(1);
    const panel = page.getByRole('complementary', { name: 'Panel hotspotu' });
    for (const toggle of [panel.getByRole('button', { name: env.annotator.username, exact: true }), panel.getByRole('button', { name: beta.name })]) {
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    }
  });
});

test.describe('confirming the annotations', () => {
  test('SCRUM-87: confirming locks the layer, taking it back unlocks it', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId);
    await viewer.start();
    await viewer.drawRectangle();
    await viewer.expectAnnotations(1);

    await viewer.confirm();
    await expect(page.getByText('Zatwierdzone, czekam na pozostałych')).toBeVisible();
    await expect(viewer.toolbar()).toHaveCount(0);
    const myStatus = async () =>
      (await annotator.get<{ my_status: string | null }>(`hotspots/${hotspotId}/agreement`)).my_status;
    expect(await myStatus()).toBe('confirmed');

    await viewer.unconfirm();
    await expect(page.getByText('Poprawiasz własną warstwę')).toBeVisible();
    await expect(viewer.tool('Poligon')).toBeVisible();
    expect(await myStatus()).toBe('draft');
  });

  test('SCRUM-87: the rating mode shows no drawing tools', async ({ page }) => {
    const viewer = new HotspotViewerPage(page);
    await viewer.goto(hotspotId, 'rate');
    await expect(page.getByRole('button', { name: 'wysoka' })).toBeVisible();
    await expect(viewer.toolbar()).toHaveCount(0);
  });
});
