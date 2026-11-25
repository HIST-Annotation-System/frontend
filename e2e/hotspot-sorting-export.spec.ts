import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { markSegmentationDone, setModelConfidence } from './helpers/db';
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
  'Niepewność modelu',
  'Niepewność segmentacji',
  'Niepewność klasyfikacji',
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

test.describe("the model's uncertainty", () => {
  test('SCRUM-79: the hotspots the model is least sure of come first, those without a value last', async ({ page }) => {
    folder = await seedFolder(
      admin,
      [unique('unsure'), unique('sure'), unique('unknown')],
      await admin.e2eOrganizationId(),
    );
    const [unsure, sure, unknown] = folder.hotspots;
    await setModelConfidence(unsure.id, 0.6, 0.5);
    await setModelConfidence(sure.id, 0.95, 0.9);
    await page.goto(`/hotspots?folder=${folder.id}&sort=model_uncertainty&order=desc`);
    await expect(page.getByRole('list').getByRole('link')).toHaveText([unsure.name, sure.name, unknown.name]);
  });

  test('SCRUM-79: an annotator cannot send a folder back to the model', async ({ page }) => {
    folder = await seedFolder(admin, [unique('rescore')], await admin.e2eOrganizationId());
    await page.goto(`/hotspots?folder=${folder.id}`);
    // A folder's buttons only appear while the pointer is over its row.
    await page.getByRole('button', { name: new RegExp(`^${folder.name}`) }).hover();
    await expect(page.getByRole('button', { name: `Zmień nazwę folderu ${folder.name}` })).toBeVisible();
    await expect(page.getByRole('button', { name: /Przelicz niepewność modelu/ })).toHaveCount(0);
    expect((await annotator.ctx.post(`hotspot-folders/${folder.id}/confidence-rescore`)).status()).toBe(403);
  });

  test.describe('as an admin', () => {
    test.use({ storageState: 'e2e/auth/admin.json' });

    test('SCRUM-79: a folder is sent back to the model for its uncertainty after confirmation', async ({ page }) => {
      folder = await seedFolder(admin, [unique('rescore')], await admin.e2eOrganizationId());
      // Segmented, but without the model's cells (the worker is not in the E2E stack), so nothing is sent.
      await markSegmentationDone(folder.hotspots[0].id);
      await page.goto(`/hotspots?folder=${folder.id}`);
      await page.getByRole('button', { name: new RegExp(`^${folder.name}`) }).hover();
      await page.getByRole('button', { name: `Przelicz niepewność modelu w folderze ${folder.name}` }).click();
      const dialog = page.getByRole('dialog').filter({ hasText: 'Przelicz niepewność modelu' });
      await dialog.getByRole('button', { name: 'Przelicz' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText(/nie ma hotspotów przetworzonych przez model/)).toBeVisible();
    });
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
