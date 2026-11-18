import { expect, test, type Locator, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { makeTiledTiff } from './helpers/tiff';

test.use({ storageState: 'e2e/auth/annotator.json' });
// The viewer loads lazily compiled code and many tiles, which is slow when several workers do it at once.
test.setTimeout(90_000);

type Slide = { id: string; name: string };
type Hotspot = { id: string; name: string; folder_id: string; slide_id: string; x: number; y: number; size: number; image_width: number };

let admin: Api;
let uploader: Api;
let slide: Slide;
let folderNames: string[];

// One 2048 x 2048 slide (a few hundred bytes) per worker; the tests only add hotspots to it and remove them again.
test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  uploader = await Api.as(env.orgAdmin);
  slide = await uploader.uploadSlide(`${unique('viewer')}.tif`, makeTiledTiff({ size: 2048 }));
});

test.beforeEach(() => {
  folderNames = [];
});

test.afterEach(async ({ page }) => {
  await page.close();
  for (const hotspot of await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`)) {
    await expect(async () => {
      expect([204, 404]).toContain((await admin.ctx.delete(`hotspots/${hotspot.id}`)).status());
    }).toPass({ timeout: 15_000 });
  }
  for (const folder of await admin.get<{ id: string; name: string }[]>('hotspot-folders')) {
    if (folderNames.includes(folder.name)) await admin.ctx.delete(`hotspot-folders/${folder.id}`);
  }
});

test.afterAll(async () => {
  await uploader.deleteSlide(slide.id);
  await admin.dispose();
  await uploader.dispose();
});

const openSlide = async (page: Page) => {
  const tiles = page.waitForResponse((response) => response.url().includes(`/slides/${slide.id}/image_files/`));
  await page.goto(`/slides/${slide.id}`);
  await tiles;
  await expect(page.getByRole('toolbar', { name: 'Zaznaczanie hotspotów' })).toBeVisible();
};

/** Drags from one point of the slide to another with the current tool, as fractions of the canvas. */
const drag = async (page: Page, from: [number, number], to: [number, number]) => {
  const box = (await page.locator('.openseadragon-canvas[tabindex="0"]').boundingBox())!;
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 10 });
  await page.mouse.up();
};

const tool = (page: Page, name: 'Nawigacja' | 'Pędzel' | 'Siatka') =>
  page.getByRole('toolbar', { name: 'Zaznaczanie hotspotów' }).getByRole('button', { name });
const selection = (page: Page) => page.getByRole('status').filter({ hasText: /pol/ });

// The dialog preselects an existing folder when there is one (other tests create folders too), so the choice is
// always made explicitly.
async function chooseFolder(dialog: Locator, folder: { newName: string } | { existing: string }) {
  const select = dialog.getByRole('combobox', { name: 'Folder' });
  if ('newName' in folder) {
    await select.selectOption({ label: '+ Nowy folder…' });
    await dialog.getByLabel('Nazwa nowego folderu').fill(folder.newName);
    return;
  }
  const option = select.getByRole('option', { name: new RegExp(folder.existing) });
  await expect(option).toBeAttached();
  await select.selectOption((await option.getAttribute('value'))!);
}

async function saveSelection(page: Page, folder: { newName: string } | { existing: string }, prefix = 'box') {
  await page.getByRole('button', { name: 'Zapisz hotspoty' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Przedrostek nazwy').fill(prefix);
  if ('newName' in folder) folderNames.push(folder.newName);
  await chooseFolder(dialog, folder);
  await dialog.getByRole('button', { name: /^Utwórz/ }).click();
  return dialog;
}

test.describe('the slide viewer', () => {
  test('SCRUM-70: the slide opens with its size and the selection tools', async ({ page }) => {
    await openSlide(page);
    await expect(page.getByRole('navigation', { name: 'Ścieżka' })).toContainText(slide.name.replace(/\.tif$/, ''));
    await expect(page.getByText('2048 × 2048 px')).toBeVisible();
    await expect(tool(page, 'Nawigacja')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'Pędzel')).toBeVisible();
    await expect(tool(page, 'Siatka')).toBeVisible();
  });
});

test.describe('selecting hotspots on the slide', () => {
  test('SCRUM-14: a grid drag marks 1024 x 1024 squares, and saving turns them into hotspots in a new folder', async ({ page }) => {
    await openSlide(page);
    await tool(page, 'Siatka').click();
    await drag(page, [0.4, 0.4], [0.6, 0.6]);
    await expect(selection(page)).toContainText('1 pole');

    const folderName = unique('boxes');
    await page.getByRole('button', { name: 'Zapisz hotspoty' }).click();
    await expect(page.getByRole('dialog').getByText('1024 × 1024 px · 256 µm')).toBeVisible();
    await page.getByRole('button', { name: 'Anuluj' }).click();
    await saveSelection(page, { newName: folderName });

    await expect(page.getByRole('status').filter({ hasText: 'Utworzono hotspoty: 1.' })).toBeVisible();
    await expect.poll(async () => (await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`)).length).toBe(1);
    const [hotspot] = await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`);
    expect(hotspot).toMatchObject({ slide_id: slide.id, size: 1024, image_width: 1024 });
    expect(hotspot.name).toMatch(/^box \(\d+, \d+\)$/);
    const folders = await admin.get<{ id: string; name: string }[]>('hotspot-folders');
    expect(folders.find((folder) => folder.id === hotspot.folder_id)?.name).toBe(folderName);
  });

  test('SCRUM-71: the squares can be added to a folder that already exists', async ({ page }) => {
    const existing = await admin.createFolder(unique('existing'), await admin.e2eOrganizationId());
    folderNames.push(existing.name);
    await openSlide(page);
    await tool(page, 'Siatka').click();
    await drag(page, [0.4, 0.4], [0.6, 0.6]);
    await saveSelection(page, { existing: existing.name });
    await expect(page.getByRole('status').filter({ hasText: 'Utworzono hotspoty: 1.' })).toBeVisible();
    await expect.poll(async () => (await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`)).map((item) => item.folder_id)).toEqual([existing.id]);
  });

  test('SCRUM-71: the count of hotspots made from the slide is shown in the status bar', async ({ page }) => {
    await openSlide(page);
    await expect(page.getByText(/Hotspoty\s*0/)).toBeVisible();
    await tool(page, 'Siatka').click();
    await drag(page, [0.4, 0.4], [0.6, 0.6]);
    await saveSelection(page, { newName: unique('count') });
    await expect(page.getByRole('status').filter({ hasText: 'Utworzono hotspoty: 1.' })).toBeVisible();
    await expect(page.getByText(/Hotspoty\s*1/)).toBeVisible();
  });

  test('SCRUM-71: a hotspot made from a slide names the slide as its source in the catalogue', async ({ page }) => {
    await openSlide(page);
    await tool(page, 'Siatka').click();
    await drag(page, [0.4, 0.4], [0.6, 0.6]);
    const folderName = unique('source');
    await saveSelection(page, { newName: folderName });
    await expect(page.getByRole('status').filter({ hasText: 'Utworzono hotspoty: 1.' })).toBeVisible();

    const [hotspot] = await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`);
    await page.goto(`/hotspots?folder=${hotspot.folder_id}`);
    await page.getByRole('checkbox', { name: `Zaznacz hotspot ${hotspot.name}` }).check();
    const panel = page.getByRole('complementary', { name: `Szczegóły hotspotu ${hotspot.name}` });
    await expect(panel).toContainText(slide.name.replace(/\.tif$/, ''));
  });

  test('SCRUM-14: the brush marks squares freely', async ({ page }) => {
    await openSlide(page);
    await tool(page, 'Pędzel').click();
    await drag(page, [0.3, 0.5], [0.7, 0.5]);
    await expect(selection(page)).toBeVisible();
    await expect(selection(page)).toContainText(/\d+ (pole|pola|pól)/);
  });

  test('SCRUM-14: the selection can be cleared before saving', async ({ page }) => {
    await openSlide(page);
    await tool(page, 'Siatka').click();
    await drag(page, [0.4, 0.4], [0.6, 0.6]);
    await expect(selection(page)).toContainText('1 pole');
    await page.getByRole('button', { name: 'Wyczyść zaznaczenie' }).click();
    await expect(selection(page)).toHaveCount(0);
    expect(await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`)).toEqual([]);
  });

  test('SCRUM-14: Escape leaves the selection tool and goes back to navigation', async ({ page }) => {
    await openSlide(page);
    await tool(page, 'Siatka').click();
    await expect(tool(page, 'Siatka')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(tool(page, 'Nawigacja')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'Siatka')).toHaveAttribute('aria-pressed', 'false');
  });

  test('SCRUM-14: cancelling the dialog keeps the selection and creates nothing', async ({ page }) => {
    await openSlide(page);
    await tool(page, 'Siatka').click();
    await drag(page, [0.4, 0.4], [0.6, 0.6]);
    await page.getByRole('button', { name: 'Zapisz hotspoty' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Anuluj' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(selection(page)).toContainText('1 pole');
    expect(await admin.get<Hotspot[]>(`hotspots?slide_id=${slide.id}`)).toEqual([]);
  });
});
