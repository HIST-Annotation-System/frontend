import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { markSegmentationDone } from './helpers/db';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';
import { HotspotViewerPage } from './pages/HotspotViewerPage';

test.use({ storageState: 'e2e/auth/annotator.json' });

let admin: Api;
let annotator: Api;
let folder: SeededFolder;
let cellTypeIds: number[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  annotator = await Api.as(env.annotator);
});

test.beforeEach(() => {
  cellTypeIds = [];
});

test.afterEach(async ({ page }) => {
  await page.close();
  if (folder) await removeFolder(admin, folder);
  for (const id of cellTypeIds) {
    await expect(async () => {
      expect([204, 404]).toContain((await admin.ctx.delete(`cell-types/${id}`)).status());
    }).toPass({ timeout: 15_000 });
  }
});

test.afterAll(async () => {
  await admin.dispose();
  await annotator.dispose();
});

const METRICS = [
  'Szacowany priorytet',
  'Data dodania',
  'Gęstość komórek',
  'Liczba komórek',
  'Entropia',
  'Kontrast tekstury (GLCM)',
  'Gęstość krawędzi',
  'Hematoksylina',
];

test.describe('sorting the catalogue', () => {
  // The sort controls only exist while the list has hotspots, so each test brings its own.
  test.beforeEach(async () => {
    folder = await seedFolder(admin, [unique('sortable')], await admin.e2eOrganizationId());
  });

  test('SCRUM-79: the annotator can choose between all the sorting metrics', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    const sort = page.getByRole('combobox', { name: 'Sortuj według' });
    await expect(sort.getByRole('option')).toHaveText(METRICS);
    await expect(sort).toHaveValue(/./);
  });

  test('SCRUM-79: choosing a metric is kept in the address, and the direction can be flipped', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('combobox', { name: 'Sortuj według' }).selectOption({ label: 'Entropia' });
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('entropy');
    const direction = page.getByRole('button', { name: /Kierunek sortowania/ });
    const before = await direction.getAttribute('aria-label');
    await direction.click();
    await expect(direction).not.toHaveAttribute('aria-label', before ?? '');
  });

  test('SCRUM-79: the chosen sorting survives a reload', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('combobox', { name: 'Sortuj według' }).selectOption({ label: 'Hematoksylina' });
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('hematoxylin');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Sortuj według' })).toHaveValue('hematoxylin');
  });
});

test.describe('exporting annotations', () => {
  test('SCRUM-81: an annotated hotspot is exported as GeoJSON', async ({ page }) => {
    folder = await seedFolder(admin, [unique('export')], await admin.e2eOrganizationId());
    const hotspotId = folder.hotspots[0].id;
    await markSegmentationDone(hotspotId);
    const cellType = await admin.createCellType(unique('Export'));
    cellTypeIds.push(cellType.id);
    expect((await annotator.ctx.post(`hotspots/${hotspotId}/reannotation`)).ok()).toBeTruthy();
    const saved = await annotator.ctx.post(`hotspots/${hotspotId}/annotations`, {
      data: {
        kind: 'cell',
        cell_type_id: cellType.id,
        geometry: { type: 'Polygon', coordinates: [[[5, 5], [30, 5], [30, 30], [5, 30], [5, 5]]] },
      },
    });
    expect(saved.ok(), `annotation: ${saved.status()}`).toBeTruthy();

    await new HotspotViewerPage(page).goto(hotspotId);
    await page.getByRole('button', { name: 'Parametry' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Eksport/ }).click();
    const file = await (await download).path();
    const geojson = JSON.parse(await readFile(file, 'utf8')) as { type: string; features: { geometry: { type: string } }[] };
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0].geometry.type).toBe('Polygon');
  });
});
