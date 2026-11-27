import { expect, test, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { removeFolder, seedFolder, type SeededFolder } from './helpers/hotspots';
import { dialogTitled } from './helpers/ui';

test.use({ storageState: 'e2e/auth/annotator.json' });

type Hotspot = { id: string; name: string; folder_id: string; tags: { name: string }[] };

let admin: Api;
let annotator: Api;
let folder: SeededFolder;
let extraFolders: SeededFolder[];
let names: { plain: string; rated: string; custom: string };
let customTag: string;

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  annotator = await Api.as(env.annotator);
});

// plain: nothing set. rated: priority and correctness. custom: those two and a tag of its own.
test.beforeEach(async () => {
  const prefix = unique('review');
  names = { plain: `${prefix}-plain`, rated: `${prefix}-rated`, custom: `${prefix}-custom` };
  customTag = unique('tag');
  extraFolders = [];
  folder = await seedFolder(admin, [names.plain, names.rated, names.custom], await admin.e2eOrganizationId());
  const [, rated, custom] = folder.hotspots;
  const high = await admin.tagId('wysoka');
  const correct = await admin.tagId('poprawna');
  const own = (await admin.createTag(customTag, 2)).id;
  for (const hotspot of [rated, custom]) {
    await admin.addHotspotTag(hotspot.id, high);
    await admin.addHotspotTag(hotspot.id, correct);
  }
  await admin.addHotspotTag(custom.id, own);
});

test.afterEach(async ({ page }) => {
  await page.close();
  await removeFolder(admin, folder);
  for (const extra of extraFolders) await removeFolder(admin, extra);
  for (const tag of await admin.get<{ id: number; name: string }[]>('tags/')) {
    if (tag.name === customTag) await admin.ctx.delete(`tags/${tag.id}`);
  }
});

test.afterAll(async () => {
  await admin.dispose();
  await annotator.dispose();
});

const link = (page: Page, name: string) => page.getByRole('list').getByRole('link', { name, exact: true });
const reannotateUrl = () => `/hotspots?folder=${folder.id}&mode=reannotate`;
const hotspotTags = async (id: string) => (await annotator.get<Hotspot>(`hotspots/${id}`)).tags.map((tag) => tag.name).sort();

test.describe('working modes', () => {
  test('SCRUM-78: assessing lists the unrated hotspots, reannotating the rated ones', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await expect(link(page, names.plain)).toBeVisible();
    await expect(link(page, names.rated)).toHaveCount(0);
    await expect(link(page, names.custom)).toHaveCount(0);

    await page.getByRole('group', { name: 'Tryb pracy' }).getByRole('button', { name: 'Reannotuj' }).click();
    await expect(link(page, names.rated)).toBeVisible();
    await expect(link(page, names.custom)).toBeVisible();
    await expect(link(page, names.plain)).toHaveCount(0);
    await expect(page.getByText('2 z 3')).toBeVisible();
  });

  test('SCRUM-78: "Wszystkie statusy" lists everything again', async ({ page }) => {
    await page.goto(reannotateUrl());
    await expect(link(page, names.plain)).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Status oceny' }).selectOption({ label: 'Wszystkie statusy' });
    await expect(link(page, names.plain)).toBeVisible();
    await expect(link(page, names.rated)).toBeVisible();
    await expect(link(page, names.custom)).toBeVisible();
  });

  test('SCRUM-79: reannotating offers its own sort orders', async ({ page }) => {
    await page.goto(reannotateUrl());
    await expect(page.getByRole('combobox', { name: 'Sortuj według' }).getByRole('option')).toHaveText([
      'Wynik tagów',
      'Data dodania',
      'Niezgodność anotatorów',
      'Niepewność modelu',
      'Niepewność segmentacji',
      'Niepewność klasyfikacji',
      'Liczba masek do poprawy',
    ]);
  });

  test('SCRUM-79: a higher tag score comes first', async ({ page }) => {
    await page.goto(reannotateUrl());
    await expect(page.getByRole('list').getByRole('link')).toHaveText([names.custom, names.rated]);
    await page.getByRole('button', { name: /Kierunek sortowania/ }).click();
    await expect(page.getByRole('list').getByRole('link')).toHaveText([names.rated, names.custom]);
  });
});

test.describe('tag filter', () => {
  test('SCRUM-76: ticking a tag keeps only the hotspots that carry it, clearing brings them back', async ({ page }) => {
    await page.goto(reannotateUrl());
    await page.getByRole('button', { name: /Filtr tagów/ }).click();
    const menu = page.getByRole('group', { name: 'Filtr tagów' });
    await menu.getByRole('checkbox', { name: customTag }).check();
    await expect(link(page, names.custom)).toBeVisible();
    await expect(link(page, names.rated)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Filtr tagów/ })).toContainText('1');

    await menu.getByRole('button', { name: 'Wyczyść filtr' }).click();
    await expect(link(page, names.rated)).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Wyczyść filtr' })).toBeDisabled();
  });

  test('SCRUM-76: only one tag per rating can be ticked at a time', async ({ page }) => {
    await page.goto(reannotateUrl());
    await page.getByRole('button', { name: /Filtr tagów/ }).click();
    const priority = page.getByRole('group', { name: 'Filtr tagów' }).getByRole('group', { name: 'Priorytet' });
    await priority.getByRole('checkbox', { name: 'wysoka' }).check();
    await priority.getByRole('checkbox', { name: 'niska' }).check();
    await expect(priority.getByRole('checkbox', { name: 'niska' })).toBeChecked();
    await expect(priority.getByRole('checkbox', { name: 'wysoka' })).not.toBeChecked();
    await expect(link(page, names.rated)).toHaveCount(0);
  });
});

test.describe('bulk actions', () => {
  const select = async (page: Page, ...hotspotNames: string[]) => {
    for (const name of hotspotNames) await page.getByRole('checkbox', { name: `Zaznacz hotspot ${name}` }).check();
  };
  const bulkBar = (page: Page) => page.getByRole('region', { name: 'Zaznaczone hotspoty' });

  test('SCRUM-211: sets the priority of all selected hotspots', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    const plain = folder.hotspots[0];
    await select(page, names.plain);
    await bulkBar(page).getByRole('combobox', { name: 'Ustaw: priorytet' }).selectOption({ label: 'Priorytet: niska' });
    await expect.poll(() => hotspotTags(plain.id)).toEqual(['niska']);
  });

  test('SCRUM-211: adds a tag to, and removes it from, several hotspots at once', async ({ page }) => {
    await page.goto(reannotateUrl());
    const [, rated, custom] = folder.hotspots;
    await select(page, names.rated, names.custom);
    await expect(bulkBar(page)).toContainText('Zaznaczono 2');

    const shared = unique('shared');
    await admin.createTag(shared, 1);
    try {
      await page.reload();
      await select(page, names.rated, names.custom);
      await bulkBar(page).getByRole('combobox', { name: 'Dodaj tag' }).selectOption({ label: shared });
      await expect.poll(() => hotspotTags(rated.id)).toContain(shared);
      await expect.poll(() => hotspotTags(custom.id)).toContain(shared);

      await bulkBar(page).getByRole('combobox', { name: 'Usuń tag' }).selectOption({ label: shared });
      await expect.poll(() => hotspotTags(rated.id)).not.toContain(shared);
      await expect.poll(() => hotspotTags(custom.id)).not.toContain(shared);
    } finally {
      const tag = (await admin.get<{ id: number; name: string }[]>('tags/')).find((item) => item.name === shared);
      if (tag) await admin.ctx.delete(`tags/${tag.id}`);
    }
  });

  test('SCRUM-211: clearing the selection hides the bulk actions', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await select(page, names.plain);
    await bulkBar(page).getByRole('button', { name: 'Odznacz wszystkie' }).click();
    await expect(page.getByRole('checkbox', { name: `Zaznacz hotspot ${names.plain}` })).not.toBeChecked();
    await expect(bulkBar(page).getByRole('combobox', { name: 'Ustaw: priorytet' })).toHaveCount(0);
  });
});

test.describe('details panel actions for annotators', () => {
  test('an annotator cannot rename, move or delete a hotspot', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await page.getByRole('checkbox', { name: `Zaznacz hotspot ${names.plain}` }).check();
    const panel = page.getByRole('complementary', { name: `Szczegóły hotspotu ${names.plain}` });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Więcej działań' })).toHaveCount(0);
    const hotspotId = folder.hotspots[0].id;
    expect((await annotator.ctx.patch(`hotspots/${hotspotId}`, { data: { name: unique('x') } })).status()).toBe(403);
    expect((await annotator.ctx.delete(`hotspots/${hotspotId}`)).status()).toBe(403);
  });
});

// Renaming, moving and deleting hotspots is for administrators.
test.describe('details panel actions', () => {
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  const openMenu = async (page: Page, name: string, item: string) => {
    await page.getByRole('checkbox', { name: `Zaznacz hotspot ${name}` }).check();
    const panel = page.getByRole('complementary', { name: `Szczegóły hotspotu ${name}` });
    await panel.getByRole('button', { name: 'Więcej działań' }).click();
    await page.getByRole('button', { name: item }).click();
    return panel;
  };

  test('SCRUM-78: renames a hotspot', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    const renamed = unique('renamed');
    const panel = await openMenu(page, names.plain, 'Zmień nazwę');
    const input = panel.getByRole('textbox', { name: 'Nazwa hotspotu (Enter zapisuje, Esc anuluje)' });
    await input.fill(renamed);
    await input.press('Enter');
    await expect(link(page, renamed)).toBeVisible();
    await expect(link(page, names.plain)).toHaveCount(0);
    expect((await annotator.get<Hotspot>(`hotspots/${folder.hotspots[0].id}`)).name).toBe(renamed);
  });

  test('SCRUM-78: moves a hotspot to another folder of the organization', async ({ page }) => {
    const target = await seedFolder(admin, [], await admin.e2eOrganizationId());
    extraFolders.push(target);
    await page.goto(`/hotspots?folder=${folder.id}`);
    const panel = await openMenu(page, names.plain, 'Przenieś do folderu…');
    await panel.getByLabel('Przenieś do folderu').selectOption({ label: target.name });
    await panel.getByRole('button', { name: 'Przenieś' }).click();
    await expect(link(page, names.plain)).toHaveCount(0);
    await expect.poll(async () => (await annotator.get<Hotspot>(`hotspots/${folder.hotspots[0].id}`)).folder_id).toBe(target.id);
  });

  test('SCRUM-78: deletes a hotspot after confirmation', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await openMenu(page, names.plain, 'Usuń hotspot');
    await dialogTitled(page, 'Usuń hotspot').getByRole('button', { name: 'Usuń', exact: true }).click();
    await expect(link(page, names.plain)).toHaveCount(0);
    expect((await annotator.ctx.get(`hotspots/${folder.hotspots[0].id}`)).status()).toBe(404);
  });

  test('SCRUM-78: going back from the delete dialog keeps the hotspot', async ({ page }) => {
    await page.goto(`/hotspots?folder=${folder.id}`);
    await openMenu(page, names.plain, 'Usuń hotspot');
    await dialogTitled(page, 'Usuń hotspot').getByRole('button', { name: 'Wróć' }).click();
    await expect(link(page, names.plain)).toBeVisible();
    expect((await annotator.ctx.get(`hotspots/${folder.hotspots[0].id}`)).status()).toBe(200);
  });
});
