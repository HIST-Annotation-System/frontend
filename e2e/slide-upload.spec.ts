import { expect, test, type Page } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { makeTiledTiff } from './helpers/tiff';

test.use({ storageState: 'e2e/auth/orgadmin.json' });

type Slide = {
  id: string;
  name: string;
  status: string;
  error_message: string | null;
  width: number | null;
  mpp_x: number | null;
  organization_id: number | null;
};

let admin: Api;
let prefix: string;

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  prefix = unique('upload');
});

// Removes every slide the test uploaded, found by the prefix of its file name.
test.afterEach(async ({ page }) => {
  await page.close();
  for (const slide of await admin.get<Slide[]>('slides')) {
    if (slide.name.startsWith(prefix)) await admin.deleteSlide(slide.id);
  }
});

test.afterAll(async () => {
  await admin.dispose();
});

const slidesNamed = async () => (await admin.get<Slide[]>('slides')).filter((slide) => slide.name.startsWith(prefix));
const queue = (page: Page) => page.getByRole('region', { name: 'Kolejka wgrywania' });

async function upload(page: Page, ...files: { name: string; buffer: Buffer }[]) {
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles(
    files.map((file) => ({ name: file.name, mimeType: 'application/octet-stream', buffer: file.buffer })),
  );
}

test.describe('uploading slides', () => {
  test('SCRUM-52: a TIFF slide is uploaded, processed and ready to open', async ({ page }) => {
    const tiff = makeTiledTiff();
    await upload(page, { name: `${prefix}.tif`, buffer: tiff });
    await expect(queue(page)).toContainText(`${prefix}.tif`);
    await expect(page.getByRole('link', { name: prefix, exact: true })).toBeVisible();

    const [slide] = await slidesNamed();
    expect(slide).toMatchObject({ status: 'ready', width: 256, mpp_x: 0.25 });
    await page.getByRole('listitem').filter({ hasText: prefix }).first().click();
    await expect(page.getByRole('complementary', { name: 'Podgląd slajdu' })).toContainText('Gotowy');
  });

  test('SCRUM-23: several slides can be uploaded at once', async ({ page }) => {
    await upload(
      page,
      { name: `${prefix}-a.tif`, buffer: makeTiledTiff({ color: [200, 120, 170] }) },
      { name: `${prefix}-b.tif`, buffer: makeTiledTiff({ color: [120, 160, 200] }) },
    );
    await expect(page.getByRole('link', { name: `${prefix}-a`, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: `${prefix}-b`, exact: true })).toBeVisible();
    expect((await slidesNamed()).map((slide) => slide.status)).toEqual(['ready', 'ready']);
  });

  test('SCRUM-23: a file type that is not a slide is refused before any upload', async ({ page }) => {
    await upload(page, { name: `${prefix}.txt`, buffer: Buffer.from('not a slide') });
    await expect(page.getByText('Nieobsługiwany typ pliku (.txt).')).toBeVisible();
    expect(await slidesNamed()).toEqual([]);
  });

  test('SCRUM-23: a multi-file format asks for a .zip', async ({ page }) => {
    await upload(page, { name: `${prefix}.mrxs`, buffer: Buffer.from('x') });
    await expect(page.getByText(/format wieloplikowy/)).toBeVisible();
    expect(await slidesNamed()).toEqual([]);
  });

  test('SCRUM-52: a slide without resolution data ends as failed, with the reason', async ({ page }) => {
    await upload(page, { name: `${prefix}.tif`, buffer: makeTiledTiff({ withResolution: false }) });
    const item = page.getByRole('listitem').filter({ hasText: prefix }).first();
    await expect(item).toContainText('Błąd');
    await item.click();
    await expect(page.getByRole('complementary', { name: 'Podgląd slajdu' })).toContainText(
      'The slide has no resolution (MPP) metadata.',
    );
    const [slide] = await slidesNamed();
    expect(slide.status).toBe('failed');
  });

  test('SCRUM-23: a TIFF renamed to .svs is refused because its content does not match', async ({ page }) => {
    await upload(page, { name: `${prefix}.svs`, buffer: makeTiledTiff() });
    const item = page.getByRole('listitem').filter({ hasText: prefix }).first();
    await expect(item).toContainText('Błąd');
    const [slide] = await slidesNamed();
    expect(slide.status).toBe('failed');
    expect(slide.error_message).toContain("doesn't match its extension");
  });

  test('SCRUM-52: uploading the same file again asks first, and can be done anyway', async ({ page }) => {
    const tiff = makeTiledTiff();
    await upload(page, { name: `${prefix}.tif`, buffer: tiff });
    await expect(page.getByRole('link', { name: prefix, exact: true })).toBeVisible();

    await page.locator('input[type=file]').first().setInputFiles({ name: `${prefix}.tif`, mimeType: 'image/tiff', buffer: tiff });
    await expect(queue(page).getByText(/jest już w bibliotece/)).toBeVisible();
    expect(await slidesNamed()).toHaveLength(1);

    await queue(page).getByRole('button', { name: 'Wgraj mimo to' }).click();
    // Ingest runs two slides at a time for every worker of the suite, so it can take longer than the default 10 s.
    await expect
      .poll(async () => (await slidesNamed()).map((slide) => `${slide.status}${slide.error_message ? `: ${slide.error_message}` : ''}`), {
        timeout: 30_000,
      })
      .toEqual(['ready', 'ready']);
  });

  test('SCRUM-52: a finished upload can be removed from the queue', async ({ page }) => {
    await upload(page, { name: `${prefix}.tif`, buffer: makeTiledTiff() });
    await expect(page.getByRole('link', { name: prefix, exact: true })).toBeVisible();
    await queue(page).getByRole('button', { name: `Usuń ${prefix}.tif z listy` }).click();
    await expect(queue(page)).toHaveCount(0);
  });
});

test.describe('an upload started elsewhere', () => {
  // The browser that uploads reports its progress to the API, so another administrator sees it too (SCRUM-45).
  test('SCRUM-45: another client sees the slide as uploading, with the reported progress, until it is cancelled', async ({ page }) => {
    const uploader = await Api.as(env.admin);
    const { slide_id: slideId } = await uploader.ctx
      .post('upload/start', { data: { filename: `${prefix}.tif`, file_size: 1000, organization_id: await uploader.e2eOrganizationId() } })
      .then(async (response) => {
        expect(response.ok(), `start: ${response.status()}`).toBeTruthy();
        return (await response.json()) as { slide_id: string };
      });
    try {
      expect((await uploader.ctx.post(`upload/${slideId}/progress`, { data: { percent: 40 } })).ok()).toBeTruthy();

      await page.goto('/');
      await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill(prefix);
      const item = page.getByRole('listitem').filter({ hasText: prefix });
      await expect(item).toContainText('Wgrywanie');
      await item.click();
      const panel = page.getByRole('complementary', { name: 'Podgląd slajdu' });
      await expect(panel.getByRole('progressbar', { name: 'Postęp wgrywania' })).toHaveAttribute('aria-valuenow', '40');
      await expect(panel).toContainText(env.admin.username);

      expect((await uploader.ctx.post(`upload/${slideId}/cancel`)).ok()).toBeTruthy();
      await page.reload();
      await page.getByRole('searchbox', { name: 'Szukaj slajdu' }).fill(prefix);
      await expect(page.getByRole('listitem').filter({ hasText: prefix })).toHaveCount(0);
    } finally {
      await uploader.ctx.post(`upload/${slideId}/cancel`).catch(() => undefined);
      await uploader.dispose();
    }
  });
});

test.describe('uploads that do not finish', () => {
  const storage = `**/localhost:${process.env.E2E_S3_PORT}/**`;

  test('SCRUM-20: a running upload can be cancelled and leaves no slide behind', async ({ page }) => {
    // The part is never answered, so the upload stays in progress until it is cancelled.
    await page.route(storage, () => undefined);
    await upload(page, { name: `${prefix}.tif`, buffer: makeTiledTiff() });
    const cancel = queue(page).getByRole('button', { name: `Anuluj wgrywanie pliku ${prefix}.tif` });
    await expect(cancel).toBeVisible();
    await expect.poll(async () => (await slidesNamed()).map((slide) => slide.status)).toEqual(['uploading']);

    await cancel.click();
    await expect.poll(async () => (await slidesNamed()).length).toBe(0);
    await expect(queue(page).getByRole('button', { name: `Anuluj wgrywanie pliku ${prefix}.tif` })).toHaveCount(0);
  });

  test('SCRUM-20: an upload that lost its connection can be resumed and then finishes', async ({ page }) => {
    test.setTimeout(90_000);
    await page.route(storage, (route) => route.abort('connectionreset'));
    await upload(page, { name: `${prefix}.tif`, buffer: makeTiledTiff() });
    await expect(queue(page).getByText(/Połączenie zostało przerwane/)).toBeVisible({ timeout: 45_000 });

    await page.unroute(storage);
    await queue(page).getByRole('button', { name: 'Wznów' }).click();
    await expect(page.getByRole('link', { name: prefix, exact: true })).toBeVisible();
    expect((await slidesNamed()).map((slide) => slide.status)).toEqual(['ready']);
  });
});

test.describe("the system admin's upload destination", () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  /** Opens the destination dialog, picks the destination, and hands the file to the picker that opens. */
  async function uploadAs(page: Page, name: string, choose: (dialog: ReturnType<Page['getByRole']>) => Promise<void>) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Wgraj', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Wgraj slajdy' });
    await expect(dialog).toBeVisible();
    await choose(dialog);
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: 'Wybierz pliki…' }).click();
    await (await chooser).setFiles({ name, mimeType: 'image/tiff', buffer: makeTiledTiff() });
  }

  test('uploads a global slide that every organization sees', async ({ page }) => {
    await uploadAs(page, `${prefix}.tif`, async (dialog) => {
      await dialog.getByRole('radio', { name: /Globalnie/ }).check();
    });
    await expect.poll(async () => (await slidesNamed()).map((slide) => slide.status)).toEqual(['ready']);
    const [slide] = await slidesNamed();
    expect(slide.organization_id).toBeNull();

    const orgAdmin = await Api.as(env.orgAdmin);
    const seen = await orgAdmin.get<Slide[]>('slides');
    expect(seen.map((item) => item.id)).toContain(slide.id);
    await orgAdmin.dispose();
  });

  test('uploads a slide into the chosen organization', async ({ page }) => {
    const organizationId = await admin.e2eOrganizationId();
    await uploadAs(page, `${prefix}.tif`, async (dialog) => {
      await dialog.getByRole('radio', { name: /Jedna organizacja/ }).check();
      await dialog.getByRole('combobox', { name: 'Organizacja' }).selectOption(String(organizationId));
    });
    await expect.poll(async () => (await slidesNamed()).map((slide) => slide.status)).toEqual(['ready']);
    expect((await slidesNamed())[0].organization_id).toBe(organizationId);
  });

  test('only the system admin may start a global upload', async () => {
    const orgAdmin = await Api.as(env.orgAdmin);
    const response = await orgAdmin.ctx.post('upload/start', {
      data: { filename: `${prefix}.tif`, file_size: 10, is_global: true },
    });
    expect(response.status()).toBe(403);
    await orgAdmin.dispose();
  });
});
