import { expect, request, test } from '@playwright/test';
import { env } from './env';
import { Api, unique } from './helpers/api';

const ADMIN_ONLY_PAGES = ['organizations', 'cell-types', 'priority-weights'];
// Stats and tags: an org admin sees their organization's.
const MANAGER_PAGES = ['users', 'agreement', 'stats', 'tags'];
// The role check comes before the lookup, so an annotator gets 403 even for an id that doesn't exist.
const NO_SUCH_ID = '00000000-0000-0000-0000-000000000000';

test.describe('anonymous visitor', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ['/', '/hotspots', '/profile', '/admin/users']) {
    test(`SCRUM-22: ${path} redirects to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL('/login');
    });
  }

  test('SCRUM-22: the API answers 401 without a session', async () => {
    const anonymous = await request.newContext({ baseURL: `${env.apiUrl}/` });
    const paths = ['users/me', 'users/', 'slides', 'hotspots', 'hotspot-folders', 'tags/', 'cell-types/', 'categories/', 'stats/'];
    for (const path of paths) {
      const response = await anonymous.get(path);
      expect(response.status(), `GET ${path}`).toBe(401);
    }
    await anonymous.dispose();
  });
});

test.describe('annotator', () => {
  test.use({ storageState: 'e2e/auth/annotator.json' });

  for (const section of [...MANAGER_PAGES, ...ADMIN_ONLY_PAGES]) {
    test(`SCRUM-27: /admin/${section} redirects to the app`, async ({ page }) => {
      await page.goto(`/admin/${section}`);
      await expect(page).toHaveURL('/');
    });
  }

  test('SCRUM-27: the API refuses administrator endpoints with 403', async () => {
    const annotator = await Api.as(env.annotator);
    const forbidden = [
      ['get', 'users/'],
      ['post', 'users/'],
      ['get', 'organizations/'],
      ['post', 'upload/start'],
      ['get', 'stats/'],
      ['get', 'storage/browse'],
      ['post', 'cell-types/'],
      ['patch', 'priority-weights/'],
      ['delete', `hotspot-folders/${NO_SUCH_ID}`],
      ['delete', `hotspots/${NO_SUCH_ID}`],
    ] as const;
    for (const [method, path] of forbidden) {
      const response = await annotator.ctx[method](path, method === 'get' ? undefined : { data: {} });
      expect(response.status(), `${method.toUpperCase()} ${path}`).toBe(403);
    }
    await annotator.dispose();
  });
});

test.describe('org admin', () => {
  test.use({ storageState: 'e2e/auth/orgadmin.json' });

  for (const section of MANAGER_PAGES) {
    test(`SCRUM-27: /admin/${section} is available`, async ({ page }) => {
      await page.goto(`/admin/${section}`);
      await expect(page).toHaveURL(`/admin/${section}`);
      await expect(page.getByRole('navigation', { name: 'Administracja' })).toBeVisible();
    });
  }

  for (const section of ADMIN_ONLY_PAGES) {
    test(`SCRUM-27: /admin/${section} redirects to the app`, async ({ page }) => {
      await page.goto(`/admin/${section}`);
      await expect(page).toHaveURL('/');
    });
  }

  test('SCRUM-27: the admin menu lists only the pages of an org admin', async ({ page }) => {
    await page.goto('/admin');
    const menu = page.getByRole('navigation', { name: 'Administracja' });
    await expect(menu.getByRole('link')).toHaveText(['Statystyki', 'Zgodność reannotacji', 'Użytkownicy', 'Tagi hotspotów']);
  });

  test('SCRUM-27: the API refuses system-admin endpoints with 403', async () => {
    const orgAdmin = await Api.as(env.orgAdmin);
    for (const path of ['organizations/', 'storage/browse']) {
      expect((await orgAdmin.ctx.get(path)).status(), `GET ${path}`).toBe(403);
    }
    for (const [path, data] of [
      ['cell-types/', { name: unique('blocked') }],
      ['users/', { username: unique('blocked'), password: 'Start-pass-1', role: 'ADMIN' }],
    ] as const) {
      expect((await orgAdmin.ctx.post(path, { data })).status(), `POST ${path}`).toBe(403);
    }
    await orgAdmin.dispose();
  });
});

test.describe('system admin', () => {
  test.use({ storageState: 'e2e/auth/admin.json' });

  for (const section of [...MANAGER_PAGES, ...ADMIN_ONLY_PAGES]) {
    test(`SCRUM-27: /admin/${section} is available`, async ({ page }) => {
      await page.goto(`/admin/${section}`);
      await expect(page).toHaveURL(`/admin/${section}`);
    });
  }
});

test.describe('organization isolation', () => {
  test('SCRUM-27: an org admin cannot see or touch accounts and folders of another organization', async () => {
    const admin = await Api.as(env.admin);
    const orgAdmin = await Api.as(env.orgAdmin);
    const other = await admin.createOrganization(unique('other-org'));
    const outsider = await admin.createUser({
      username: unique('outsider'),
      password: 'Start-pass-1',
      organizationId: other.id,
    });
    const folder = await admin.createFolder(unique('other-folder'), other.id);
    try {
      const users = await orgAdmin.get<{ id: number }[]>('users/');
      expect(users.map((user) => user.id)).not.toContain(outsider.id);

      const folders = await orgAdmin.get<{ id: string }[]>('hotspot-folders');
      expect(folders.map((item) => item.id)).not.toContain(folder.id);

      const stats = await orgAdmin.get<{ folders: { id: string }[] }>('stats/');
      expect(stats.folders.map((item) => item.id)).not.toContain(folder.id);
      expect((await orgAdmin.ctx.get(`stats/?organization_id=${other.id}`)).status()).toBe(404);

      expect((await orgAdmin.ctx.put(`users/${outsider.id}`, { data: { first_name: 'Hijacked' } })).status()).toBe(404);
      expect((await orgAdmin.ctx.delete(`users/${outsider.id}`)).status()).toBe(404);
      expect((await orgAdmin.ctx.delete(`hotspot-folders/${folder.id}`)).status()).toBe(404);
    } finally {
      await admin.deleteFolder(folder.id);
      await admin.deleteUser(outsider.id);
      await admin.deleteOrganization(other.id);
      await admin.dispose();
      await orgAdmin.dispose();
    }
  });
});
