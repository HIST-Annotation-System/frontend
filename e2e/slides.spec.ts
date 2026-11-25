import { expect, test, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { deleteSlide, insertSlide } from './helpers/db';
import { dialogTitled } from './helpers/ui';

// Slides need a real WSI upload, which the suite does not do, so their rows are inserted directly. They have no file,
// so only the catalogue is covered here, not the viewer.
let admin: Api;
let slideIds: string[];
let organizationIds: number[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  slideIds = [];
  organizationIds = [];
});

test.afterEach(async () => {
  for (const id of slideIds) await deleteSlide(id);
  for (const id of organizationIds) await admin.deleteOrganization(id);
});

test.afterAll(async () => {
  await admin.dispose();
});

async function seedSlide(name: string, status = 'ready', organizationId?: number) {
  const id = await insertSlide(organizationId ?? (await admin.e2eOrganizationId()), name, status);
  slideIds.push(id);
  return id;
}

const slideLink = (page: Page, name: string) => page.getByRole('link', { name, exact: true });
const slideItem = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

test.describe('as annotator', () => {
  test.use({ storageState: 'e2e/auth/annotator.json' });

  test('SCRUM-71: a ready slide is listed and opens its page', async ({ page }) => {
    const name = unique('slide');
    const id = await seedSlide(name);
    await page.goto('/');
    await slideLink(page, name).click();
    await expect(page).toHaveURL(`/slides/${id}`);
  });

  test('SCRUM-71: the search box narrows the list', async ({ page }) => {
    const prefix = unique('find');
    await seedSlide(`${prefix}-wanted`);
    await seedSlide(`${prefix}-other`);
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill('wanted');
    await expect(slideLink(page, `${prefix}-wanted`)).toBeVisible();
    await expect(slideLink(page, `${prefix}-other`)).toHaveCount(0);
  });

  test('SCRUM-71: the state filter shows only failed slides', async ({ page }) => {
    const prefix = unique('state');
    await seedSlide(`${prefix}-ok`);
    await seedSlide(`${prefix}-broken`, 'failed');
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill(prefix);
    await page.getByRole('combobox', { name: 'Stan slajdów' }).selectOption({ label: 'Błędy (1)' });
    await expect(slideItem(page, `${prefix}-broken`)).toContainText('Błąd');
    await expect(slideItem(page, `${prefix}-ok`)).toHaveCount(0);
  });

  test('SCRUM-71: slides can be sorted by name', async ({ page }) => {
    const prefix = unique('sort');
    await seedSlide(`${prefix}-b`);
    await seedSlide(`${prefix}-a`);
    await seedSlide(`${prefix}-c`);
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill(prefix);
    const sort = page.getByRole('combobox', { name: 'Kolejność' });
    await sort.selectOption({ label: 'Nazwa A–Z' });
    await expect(page.getByRole('list').getByRole('link')).toHaveText([`${prefix}-a`, `${prefix}-b`, `${prefix}-c`]);
    await sort.selectOption({ label: 'Nazwa Z–A' });
    await expect(page.getByRole('list').getByRole('link')).toHaveText([`${prefix}-c`, `${prefix}-b`, `${prefix}-a`]);
  });

  test('SCRUM-71: a slide of another organization is not listed', async ({ page }) => {
    const other = await admin.createOrganization(unique('other-org'));
    organizationIds.push(other.id);
    const foreign = unique('foreign');
    const own = unique('own');
    await seedSlide(foreign, 'ready', other.id);
    await seedSlide(own);
    await page.goto('/');
    await expect(slideLink(page, own)).toBeVisible();
    await expect(slideLink(page, foreign)).toHaveCount(0);
  });

  test('SCRUM-71: an annotator cannot rename or delete slides', async ({ page }) => {
    const name = unique('readonly');
    const id = await seedSlide(name);
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill(name);
    await slideItem(page, name).click();
    const panel = page.getByRole('complementary', { name: 'Podgląd slajdu' });
    await expect(panel.getByRole('heading', { name })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Więcej działań' })).toHaveCount(0);

    const annotator = await Api.as(env.annotator);
    expect((await annotator.ctx.patch(`slides/${id}`, { data: { name: 'x' } })).status()).toBe(403);
    expect((await annotator.ctx.delete(`slides/${id}`)).status()).toBe(403);
    await annotator.dispose();
  });

  test('SCRUM-52: an annotator has no upload button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Slajdy/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wgraj', exact: true })).toHaveCount(0);
  });
});

test.describe('as org admin', () => {
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  const select = async (page: Page, name: string) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill(name);
    await slideItem(page, name).click();
    return page.getByRole('complementary', { name: 'Podgląd slajdu' });
  };
  const slideNames = async () => (await admin.get<{ name: string }[]>('slides')).map((slide) => slide.name);

  test('SCRUM-71: selecting a slide shows its details', async ({ page }) => {
    const name = unique('detail');
    await seedSlide(name);
    const panel = await select(page, name);
    await expect(panel.getByRole('heading', { name })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Otwórz', exact: true })).toBeVisible();
  });

  test('SCRUM-71: renames a slide', async ({ page }) => {
    const name = unique('rename');
    const renamed = unique('renamed');
    await seedSlide(name);
    const panel = await select(page, name);
    await panel.getByRole('button', { name: 'Więcej działań' }).click();
    await page.getByRole('button', { name: 'Zmień nazwę' }).click();
    const input = panel.getByRole('textbox', { name: 'Nazwa slajdu (Enter zapisuje, Esc anuluje)' });
    await input.fill(renamed);
    await input.press('Enter');
    await expect(panel.getByRole('heading', { name: renamed })).toBeVisible();
    await expect.poll(slideNames).toContain(renamed);
    expect(await slideNames()).not.toContain(name);
  });

  test('SCRUM-71: deletes a slide after confirmation', async ({ page }) => {
    const name = unique('delete');
    await seedSlide(name);
    const panel = await select(page, name);
    await panel.getByRole('button', { name: 'Więcej działań' }).click();
    await page.getByRole('button', { name: 'Usuń slajd' }).click();
    await dialogTitled(page, 'Usuń slajd').getByRole('button', { name: 'Usuń', exact: true }).click();
    await expect(slideItem(page, name)).toHaveCount(0);
    expect(await slideNames()).not.toContain(name);
  });

  test('SCRUM-71: going back from the delete dialog keeps the slide', async ({ page }) => {
    const name = unique('keep');
    await seedSlide(name);
    const panel = await select(page, name);
    await panel.getByRole('button', { name: 'Więcej działań' }).click();
    await page.getByRole('button', { name: 'Usuń slajd' }).click();
    await dialogTitled(page, 'Usuń slajd').getByRole('button', { name: 'Wróć' }).click();
    await expect(slideItem(page, name)).toBeVisible();
    expect(await slideNames()).toContain(name);
  });

  test('SCRUM-52: an org admin has the upload button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Wgraj', exact: true })).toBeVisible();
  });
});

test.describe('as system admin', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  test('SCRUM-71: the system admin chooses which organization\'s slides to see', async ({ page }) => {
    const other = await admin.createOrganization(unique('other-org'));
    organizationIds.push(other.id);
    const foreign = unique('foreign');
    await seedSlide(foreign, 'ready', other.id);
    await page.goto('/');
    await expect(slideLink(page, foreign)).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Organizacja' }).selectOption({ label: other.name });
    await expect(slideLink(page, foreign)).toBeVisible();
  });
});
