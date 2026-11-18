import { expect, test, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';
import { HotspotViewerPage } from './pages/HotspotViewerPage';

test.use({ storageState: 'e2e/auth/annotator.json' });

type Hotspot = { id: string; score: number; tags: { id: number; name: string; dimension: string | null; weight: number }[] };

let admin: Api;
let annotator: Api;
let folder: SeededFolder;
let hotspotId: string;
let tagNames: string[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  annotator = await Api.as(env.annotator);
});

test.beforeEach(async () => {
  tagNames = [];
  folder = await seedFolder(admin, [unique('tagged')], await admin.e2eOrganizationId());
  hotspotId = folder.hotspots[0].id;
});

test.afterEach(async ({ page }) => {
  await page.close();
  await removeFolder(admin, folder);
  for (const tag of await admin.get<{ id: number; name: string }[]>('tags/')) {
    if (tagNames.includes(tag.name)) await admin.ctx.delete(`tags/${tag.id}`);
  }
});

test.afterAll(async () => {
  await admin.dispose();
  await annotator.dispose();
});

const hotspot = () => annotator.get<Hotspot>(`hotspots/${hotspotId}`);
const open = async (page: Page) => {
  const viewer = new HotspotViewerPage(page);
  await viewer.goto(hotspotId, 'rate');
  return viewer;
};

test.describe('rating a hotspot', () => {
  test('SCRUM-76: the priority and the correctness are set with one click and taken back with another', async ({ page }) => {
    await open(page);
    const high = page.getByRole('group', { name: 'Priorytet' }).getByRole('button', { name: 'wysoka' });
    const correct = page.getByRole('group', { name: 'Poprawność' }).getByRole('button', { name: 'poprawna' });

    await high.click();
    await correct.click();
    await expect(high).toHaveAttribute('aria-pressed', 'true');
    await expect(correct).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await hotspot()).tags.map((tag) => tag.name).sort()).toEqual(['poprawna', 'wysoka']);

    await high.click();
    await expect(high).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await hotspot()).tags.map((tag) => tag.name)).toEqual(['poprawna']);
  });

  test('SCRUM-76: only one priority can be set at a time', async ({ page }) => {
    await open(page);
    const priority = page.getByRole('group', { name: 'Priorytet' });
    await priority.getByRole('button', { name: 'wysoka' }).click();
    await priority.getByRole('button', { name: 'niska' }).click();
    await expect(priority.getByRole('button', { name: 'niska' })).toHaveAttribute('aria-pressed', 'true');
    await expect(priority.getByRole('button', { name: 'wysoka' })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await hotspot()).tags.filter((tag) => tag.dimension === 'importance').length).toBe(1);
  });

  test('SCRUM-76: reannotating is possible only after both ratings are set', async ({ page }) => {
    await open(page);
    const reannotate = page.getByRole('button', { name: 'Reannotuj obraz' });
    await expect(reannotate).toBeDisabled();
    await page.getByRole('group', { name: 'Priorytet' }).getByRole('button', { name: 'średnia' }).click();
    await expect(reannotate).toBeDisabled();
    await page.getByRole('group', { name: 'Poprawność' }).getByRole('button', { name: 'błędna' }).click();
    await expect(reannotate).toBeEnabled();
    await reannotate.click();
    await expect(page).toHaveURL(/mode=reannotate/);
  });
});

test.describe('custom tags', () => {
  test('SCRUM-211: a new tag is created and put on the hotspot, and raises its score', async ({ page }) => {
    await open(page);
    const name = unique('tag');
    tagNames.push(name);
    await page.getByRole('button', { name: 'Dodaj tag' }).click();
    const menu = page.getByRole('dialog', { name: 'Dodaj tag' });
    await menu.getByRole('textbox', { name: 'Nazwa nowego tagu' }).fill(name);
    await menu.getByRole('spinbutton', { name: 'Waga nowego tagu' }).fill('4');
    await menu.getByRole('button', { name: 'Utwórz tag' }).click();

    await expect(page.getByRole('button', { name: `Usuń tag ${name}` })).toBeVisible();
    await expect(page.getByText('wynik 4')).toBeVisible();
    const saved = await hotspot();
    expect(saved.score).toBe(4);
    expect(saved.tags.map((tag) => tag.name)).toContain(name);
  });

  test('SCRUM-211: an existing tag can be picked from the list and removed again', async ({ page }) => {
    const name = unique('shared');
    tagNames.push(name);
    await admin.createTag(name, 3);
    await open(page);
    await page.getByRole('button', { name: 'Dodaj tag' }).click();
    await page.getByRole('dialog', { name: 'Dodaj tag' }).getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.getByRole('button', { name: `Usuń tag ${name}` })).toBeVisible();
    await expect.poll(async () => (await hotspot()).tags.map((tag) => tag.name)).toContain(name);

    await page.getByRole('button', { name: `Usuń tag ${name}` }).click();
    await expect(page.getByRole('button', { name: `Usuń tag ${name}` })).toHaveCount(0);
    await expect.poll(async () => (await hotspot()).tags.map((tag) => tag.name)).not.toContain(name);
  });

  test('SCRUM-211: a tag cannot be created without a name', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Dodaj tag' }).click();
    await expect(page.getByRole('dialog', { name: 'Dodaj tag' }).getByRole('button', { name: 'Utwórz tag' })).toBeDisabled();
  });
});
