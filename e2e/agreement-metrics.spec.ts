import { expect, test, type Page } from '@playwright/test';
import { env } from './env';
import { Api, completeFirstLogin, unique, type Credentials } from './helpers/api';
import { markSegmentationDone } from './helpers/db';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';
import { dialogTitled } from './helpers/ui';

type Polygon = { type: 'Polygon'; coordinates: number[][][] };

const square = (x: number, y: number, size = 30): Polygon => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]],
});
const SAME = square(10, 10);
// Three squares that do not touch, so the annotators do not agree on a single cell.
const APART = [square(5, 5, 20), square(60, 5, 20), square(5, 60, 20)];

let admin: Api;
let folder: SeededFolder;
let hotspotId: string;
let cellTypeId: number;
let extraAnnotators: { credentials: Credentials; id: number }[];
let annotators: Credentials[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  const organizationId = await admin.e2eOrganizationId();
  // MIN_CONFIRMED is 3: the shared annotator plus two accounts of their own.
  extraAnnotators = [];
  for (const prefix of ['agree-b', 'agree-c']) {
    const credentials = { username: unique(prefix), password: 'Start-pass-1' };
    const { id } = await admin.createUser({ ...credentials, organizationId });
    await completeFirstLogin(credentials, prefix, 'Tester');
    extraAnnotators.push({ credentials, id });
  }
  annotators = [env.annotator, ...extraAnnotators.map((item) => item.credentials)];
});

test.beforeEach(async () => {
  folder = await seedFolder(admin, [unique('agree')], await admin.e2eOrganizationId());
  hotspotId = folder.hotspots[0].id;
  await markSegmentationDone(hotspotId);
  cellTypeId = (await admin.createCellType(unique('Agree'))).id;
});

test.afterEach(async ({ page }) => {
  await page.close();
  await removeFolder(admin, folder);
  await expect(async () => {
    expect([204, 404]).toContain((await admin.ctx.delete(`cell-types/${cellTypeId}`)).status());
  }).toPass({ timeout: 15_000 });
});

test.afterAll(async () => {
  for (const { id } of extraAnnotators) await admin.deleteUser(id);
  await admin.dispose();
});

/** Each of the first `shapes.length` annotators starts a layer of their own, draws one cell and confirms. */
async function annotate(shapes: Polygon[]) {
  for (const [index, geometry] of shapes.entries()) {
    const api = await Api.as(annotators[index]);
    expect((await api.ctx.post(`hotspots/${hotspotId}/reannotation`)).ok()).toBeTruthy();
    const drawn = await api.ctx.post(`hotspots/${hotspotId}/annotations`, {
      data: { kind: 'cell', cell_type_id: cellTypeId, geometry },
    });
    expect(drawn.ok(), `annotation: ${drawn.status()}`).toBeTruthy();
    expect((await api.ctx.put(`hotspots/${hotspotId}/reannotation/confirmation`)).ok()).toBeTruthy();
    await api.dispose();
  }
}

async function openAgreement(page: Page) {
  await page.goto(`/hotspots?folder=${folder.id}&mode=reannotate`);
  await page.getByRole('combobox', { name: 'Status oceny' }).selectOption({ label: 'Wszystkie statusy' });
  const badge = page.locator('.reannotation-badge');
  await badge.click();
  return { badge, dialog: dialogTitled(page, `Zgodność: ${folder.hotspots[0].name}`) };
}

test.describe('as org admin', () => {
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  test('SCRUM-96: annotators who draw the same cell agree, and the hotspot counts as reannotated', async ({ page }) => {
    await annotate([SAME, SAME, SAME]);
    const { badge, dialog } = await openAgreement(page);
    await expect(badge).toHaveText('Poprawione · κ Fleissa 1.00 / 0.60');
    await expect(dialog).toContainText('3 (min. 3)');
    await expect(dialog).toContainText('κ Fleissa (decyduje)');
    await expect(dialog.getByText('0.60 · osiągnięty')).toBeVisible();
    await expect(dialog.getByText('W pełni poprawione')).toBeVisible();
    await expect(dialog.getByText('zatwierdził', { exact: true })).toHaveCount(annotators.length);
  });

  test('SCRUM-97: the org admin sees what each annotator changed', async ({ page }) => {
    await annotate([SAME, SAME, SAME]);
    const { dialog } = await openAgreement(page);
    await expect(dialog.getByRole('heading', { name: 'Wkład każdego' })).toBeVisible();
    const rows = dialog.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(1)).toContainText('dodane: 1');
    await expect(rows.nth(1)).toContainText('1.00');
  });

  test('SCRUM-96: annotators who draw different cells do not reach the threshold', async ({ page }) => {
    await annotate(APART);
    const { badge, dialog } = await openAgreement(page);
    await expect(badge).not.toContainText('Poprawione');
    await expect(dialog.getByText('nieosiągnięty')).toBeVisible();
    await expect(dialog.getByText('Jeszcze nie poprawione')).toBeVisible();
    const agreement = await admin.get<{ ready: boolean; kappa: number }>(`hotspots/${hotspotId}/agreement`);
    expect(agreement.ready).toBe(false);
    expect(agreement.kappa).toBeLessThan(0.6);
  });

  test('SCRUM-96: with fewer than three confirmed layers nothing is judged yet', async ({ page }) => {
    await annotate([SAME, SAME]);
    const { badge, dialog } = await openAgreement(page);
    await expect(badge).not.toContainText('Poprawione');
    await expect(dialog).toContainText('2 z 3');
    await expect(dialog.getByText('Jeszcze nie poprawione')).toBeVisible();
    const agreement = await admin.get<{ kappa: number | null; ready: boolean }>(`hotspots/${hotspotId}/agreement`);
    expect(agreement).toMatchObject({ kappa: null, ready: false });
  });

  test('SCRUM-96: taking a confirmation back withdraws the verdict', async ({ page }) => {
    await annotate([SAME, SAME, SAME]);
    const one = await Api.as(annotators[0]);
    expect((await one.ctx.delete(`hotspots/${hotspotId}/reannotation/confirmation`)).ok()).toBeTruthy();
    await one.dispose();
    const { badge, dialog } = await openAgreement(page);
    await expect(badge).not.toContainText('Poprawione');
    await expect(dialog).toContainText('2 z 3');
    await expect(dialog).toContainText('w trakcie');
  });
});

test.describe('as annotator', () => {
  test.use({ storageState: 'e2e/auth/annotator.json' });

  test('SCRUM-97: an annotator sees how the group does, but not each colleague\'s figures', async ({ page }) => {
    await annotate([SAME, SAME, SAME]);
    const { dialog } = await openAgreement(page);
    await expect(dialog.getByText('W pełni poprawione')).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Wkład każdego' })).toHaveCount(0);
    const agreement = await admin.get<{ annotators: unknown[] | null }>(`hotspots/${hotspotId}/agreement`);
    expect(agreement.annotators).not.toBeNull();
    const asAnnotator = await Api.as(env.annotator);
    expect((await asAnnotator.get<{ annotators: unknown }>(`hotspots/${hotspotId}/agreement`)).annotators).toBeNull();
    await asAnnotator.dispose();
  });
});
