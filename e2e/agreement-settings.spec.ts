import { expect, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';

type Settings = { metric: 'kappa' | 'iou'; threshold: number };

// The E2E organization's setting is shared by all tests of this file, so they run one after another and each
// puts the original value back.
test.describe.configure({ mode: 'serial' });

let admin: Api;
let orgAdmin: Api;
let organizationId: number;
let original: Settings;

test.beforeAll(async () => {
  admin = await Api.as(env.admin);
  orgAdmin = await Api.as(env.orgAdmin);
  organizationId = await admin.e2eOrganizationId();
  original = await orgAdmin.get<Settings>('agreement-settings');
});

test.afterEach(async () => {
  await orgAdmin.ctx.put('agreement-settings', { data: original });
});

test.afterAll(async () => {
  await admin.dispose();
  await orgAdmin.dispose();
});

test.describe('as org admin', () => {
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  test('SCRUM-95: the page shows the current metric and threshold T', async ({ page }) => {
    await page.goto('/admin/agreement');
    await expect(page.getByRole('combobox', { name: 'Miara zgodności' })).toHaveValue(original.metric);
    await expect(page.getByRole('spinbutton', { name: /^Próg T/ })).toHaveValue(String(original.threshold));
    await expect(page.getByRole('button', { name: 'Zapisz' })).toBeDisabled();
  });

  test('SCRUM-95: changing the metric and T is saved for the organization', async ({ page }) => {
    const newMetric = original.metric === 'iou' ? 'kappa' : 'iou';
    const newThreshold = original.threshold === 0.75 ? 0.5 : 0.75;
    await page.goto('/admin/agreement');
    await page.getByRole('combobox', { name: 'Miara zgodności' }).selectOption(newMetric);
    await page.getByRole('spinbutton', { name: /^Próg T/ }).fill(String(newThreshold));
    const save = page.getByRole('button', { name: 'Zapisz' });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(save).toBeDisabled();

    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Miara zgodności' })).toHaveValue(newMetric);
    await expect(page.getByRole('spinbutton', { name: /^Próg T/ })).toHaveValue(String(newThreshold));
    expect(await orgAdmin.get<Settings>('agreement-settings')).toEqual({ metric: newMetric, threshold: newThreshold });
  });

  test('SCRUM-95: a threshold outside 0 to 1 is refused by the API', async () => {
    for (const threshold of [-0.1, 1.5]) {
      const response = await orgAdmin.ctx.put('agreement-settings', { data: { metric: 'kappa', threshold } });
      expect(response.status(), `threshold ${threshold}`).toBe(422);
    }
    expect(await orgAdmin.get<Settings>('agreement-settings')).toEqual(original);
  });

  test('SCRUM-95: an org admin cannot read or change another organization\'s threshold', async () => {
    const other = await admin.createOrganization(unique('other-org'));
    try {
      expect((await orgAdmin.ctx.get(`agreement-settings?organization_id=${other.id}`)).status()).toBe(404);
      const update = await orgAdmin.ctx.put(`agreement-settings?organization_id=${other.id}`, {
        data: { metric: 'iou', threshold: 0.9 },
      });
      expect(update.status()).toBe(404);
    } finally {
      await admin.deleteOrganization(other.id);
    }
  });

  test('SCRUM-27: an annotator cannot change the threshold', async () => {
    const annotator = await Api.as(env.annotator);
    const response = await annotator.ctx.put('agreement-settings', { data: { metric: 'iou', threshold: 0.9 } });
    expect(response.status()).toBe(403);
    await annotator.dispose();
  });
});

test.describe('as system admin', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  test('SCRUM-95: the threshold is set per organization', async () => {
    const other = await admin.createOrganization(unique('other-org'));
    try {
      const changed = { metric: 'iou', threshold: 0.9 } as const;
      expect((await admin.ctx.put(`agreement-settings?organization_id=${other.id}`, { data: changed })).ok()).toBeTruthy();
      expect(await admin.get<Settings>(`agreement-settings?organization_id=${other.id}`)).toEqual(changed);
      expect(await admin.get<Settings>(`agreement-settings?organization_id=${organizationId}`)).toEqual(original);
    } finally {
      await admin.deleteOrganization(other.id);
    }
  });
});
