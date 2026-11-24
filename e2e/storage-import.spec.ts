import { expect, request, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';
import { makeTiledTiff } from './helpers/tiff';

// Importing from storage has no screen: it is an API for the system admin, who points at a file already in the bucket.
const S3_URL = `http://localhost:${process.env.E2E_S3_PORT}/e2e-bucket`;

let admin: Api;
let prefix: string;
let keys: string[];
let slideIds: string[];

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
});

test.beforeEach(() => {
  prefix = unique('import');
  keys = [];
  slideIds = [];
});

test.afterEach(async () => {
  for (const id of slideIds) await admin.deleteSlide(id);
  const s3 = await request.newContext();
  for (const key of keys) await s3.delete(`${S3_URL}/${key}`);
  await s3.dispose();
});

test.afterAll(async () => {
  await admin.dispose();
});

async function putObject(name: string, body: Buffer) {
  const key = `${prefix}/${name}`;
  const s3 = await request.newContext();
  expect((await s3.put(`${S3_URL}/${key}`, { data: body })).ok()).toBeTruthy();
  await s3.dispose();
  keys.push(key);
  return key;
}

test('SCRUM-52: the storage browser lists the folders and files of the bucket', async () => {
  const key = await putObject('listed.tif', makeTiledTiff());
  const root = await admin.get<{ prefixes: string[] }>('storage/browse');
  expect(root.prefixes).toContain(`${prefix}/`);
  const inside = await admin.get<{ objects: { key: string; size: number }[] }>(`storage/browse?prefix=${prefix}/`);
  expect(inside.objects.map((object) => object.key)).toEqual([key]);
  expect(inside.objects[0].size).toBeGreaterThan(0);
});

test('SCRUM-52: a file in the bucket is imported as a slide, and importing it again returns the same slide', async () => {
  const key = await putObject('imported.tif', makeTiledTiff());
  const organizationId = await admin.e2eOrganizationId();
  const first = await admin.ctx.post('upload/import-from-storage', { data: { key, organization_id: organizationId } });
  expect(first.ok(), `import: ${first.status()}`).toBeTruthy();
  const created = (await first.json()) as { slide_id: string; created: boolean };
  slideIds.push(created.slide_id);
  expect(created.created).toBe(true);

  await expect(async () => {
    const slide = await admin.get<{ status: string; width: number; error_message: string | null }>(`slides/${created.slide_id}`);
    expect(slide, `error: ${slide.error_message}`).toMatchObject({ status: 'ready', width: 256 });
  }).toPass({ timeout: 30_000 });

  const again = await admin.ctx.post('upload/import-from-storage', { data: { key, organization_id: organizationId } });
  expect(await again.json()).toEqual({ slide_id: created.slide_id, created: false });
});

test('SCRUM-52: a key that is not in the bucket is refused as not found', async () => {
  const response = await admin.ctx.post('upload/import-from-storage', {
    data: { key: `${prefix}/missing.tif`, organization_id: await admin.e2eOrganizationId() },
  });
  expect(response.status()).toBe(404);
});

test('SCRUM-27: only the system admin may browse or import', async () => {
  const key = await putObject('forbidden.tif', makeTiledTiff());
  const orgAdmin = await Api.as(env.orgAdmin);
  expect((await orgAdmin.ctx.get('storage/browse')).status()).toBe(403);
  const response = await orgAdmin.ctx.post('upload/import-from-storage', { data: { key } });
  expect(response.status()).toBe(403);
  await orgAdmin.dispose();
});
