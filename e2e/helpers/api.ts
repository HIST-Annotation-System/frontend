import { expect, request, type APIRequestContext } from '@playwright/test';
import { env } from '../env';

export const E2E_ORGANIZATION = 'E2E Organization';

export type Credentials = { username: string; password: string };
export type Role = 'ADMIN' | 'ORG_ADMIN' | 'ANNOTATOR';

export const unique = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Playwright resolves relative paths against baseURL, which needs a trailing slash.
const baseURL = `${env.apiUrl.replace(/\/$/, '')}/`;

/** A signed-in API client (the login cookie lives in its request context). */
export class Api {
  constructor(readonly ctx: APIRequestContext) {}

  static async as(credentials: Credentials): Promise<Api> {
    const ctx = await request.newContext({ baseURL });
    const response = await ctx.post('auth/login', { data: credentials, maxRetries: 3 });
    expect(response.ok(), `login as ${credentials.username}: ${response.status()}`).toBeTruthy();
    return new Api(ctx);
  }

  dispose = (): Promise<void> => this.ctx.dispose();

  private async send<T>(method: 'post' | 'put' | 'patch' | 'delete', path: string, data?: unknown): Promise<T> {
    const response = await this.ctx[method](path, data === undefined ? { maxRetries: 3 } : { data, maxRetries: 3 });
    expect(response.ok(), `${method.toUpperCase()} ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
    return (response.status() === 204 ? undefined : await response.json()) as T;
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.ctx.get(path, { maxRetries: 3 });
    expect(response.ok(), `GET ${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
    return (await response.json()) as T;
  }

  /** The organization the E2E accounts belong to (created by auth.setup.ts). */
  async e2eOrganizationId(): Promise<number> {
    const organizations = await this.get<{ id: number; name: string }[]>('organizations/');
    const organization = organizations.find((item) => item.name === E2E_ORGANIZATION);
    if (!organization) throw new Error(E2E_ORGANIZATION + ' is missing; run the setup project first.');
    return organization.id;
  }

  createOrganization = (name: string) => this.send<{ id: number; name: string }>('post', 'organizations/', { name });
  deleteOrganization = (id: number) => this.send('delete', `organizations/${id}`);

  /** Creates an account that has not been through the first login yet (`is_first_login`). */
  createUser = (user: Credentials & { role?: Role; organizationId?: number; canUpload?: boolean }) =>
    this.send<{ id: number; username: string }>('post', 'users/', {
      username: user.username,
      password: user.password,
      role: user.role ?? 'ANNOTATOR',
      organization_id: user.organizationId,
      can_upload: user.canUpload ?? false,
    });
  /** Cleanup: an account that is already gone is fine. */
  async deleteUser(id: number): Promise<void> {
    const status = (await this.ctx.delete(`users/${id}`)).status();
    expect([200, 204, 404], `DELETE users/${id}`).toContain(status);
  }

  createFolder = (name: string, organizationId?: number) =>
    this.send<{ id: string; name: string }>('post', 'hotspot-folders', { name, organization_id: organizationId });
  deleteFolder = (id: string) => this.send('delete', `hotspot-folders/${id}`);

  /**
   * Uploads a slide file the way the browser does (start, presigned part URL, PUT to storage, complete) and waits until
   * the backend has processed it. Resolves with the slide as the API lists it, `ready` or `failed`.
   */
  async uploadSlide(filename: string, body: Buffer, organizationId?: number) {
    const started = await this.send<{ slide_id: string; upload_id: string }>('post', 'upload/start', {
      filename,
      file_size: body.length,
      organization_id: organizationId,
    });
    const { urls } = await this.send<{ urls: string[] }>('post', 'upload/presigned-urls', {
      slide_id: started.slide_id,
      upload_id: started.upload_id,
      total_parts: 1,
    });
    const put = await request.newContext();
    const stored = await put.put(urls[0], { data: body });
    expect(stored.ok(), `PUT part: ${stored.status()}`).toBeTruthy();
    const etag = stored.headers()['etag'];
    await put.dispose();
    await this.send('post', 'upload/complete', {
      slide_id: started.slide_id,
      upload_id: started.upload_id,
      parts: [{ PartNumber: 1, ETag: etag }],
    });
    type Slide = { id: string; name: string; status: string; error_message: string | null; width: number | null };
    let slide!: Slide;
    await expect(async () => {
      slide = await this.get<Slide>(`slides/${started.slide_id}`);
      expect(['ready', 'failed']).toContain(slide.status);
    }).toPass({ timeout: 30_000 });
    return slide;
  }
  deleteSlide = async (id: string) => {
    const status = (await this.ctx.delete(`slides/${id}`)).status();
    expect([204, 404], `DELETE slides/${id}`).toContain(status);
  };

  /** Uploads a PNG/JPEG as a hotspot in the folder (the image goes to S3, which now and then drops a connection). */
  async uploadHotspot(folderId: string, file: { name: string; mimeType: string; buffer: Buffer }) {
    let uploaded!: { id: string; name: string };
    await expect(async () => {
      const response = await this.ctx.post(`hotspot-folders/${folderId}/images`, { multipart: { file } });
      expect(response.ok(), `upload hotspot: ${response.status()} ${await response.text()}`).toBeTruthy();
      uploaded = (await response.json()) as { id: string; name: string };
    }).toPass({ timeout: 30_000 });
    return uploaded;
  }
  deleteHotspot = (id: string) => this.send('delete', `hotspots/${id}`);

  createTag = (name: string, weight?: number) => this.send<{ id: number; name: string }>('post', 'tags/', { name, weight });
  deleteTag = (id: number) => this.send('delete', `tags/${id}`);

  /** The id of a tag by its name (the built-in ratings are "wysoka", "poprawna", ...). */
  async tagId(name: string): Promise<number> {
    const tag = (await this.get<{ id: number; name: string }[]>('tags/')).find((item) => item.name === name);
    if (!tag) throw new Error(`Tag ${name} does not exist`);
    return tag.id;
  }
  addHotspotTag = (hotspotId: string, tagId: number) => this.send('put', `hotspots/${hotspotId}/tags/${tagId}`);

  createCellType = (name: string) => this.send<{ id: number; name: string }>('post', 'cell-types/', { name });
  deleteCellType = (id: number) => this.send('delete', `cell-types/${id}`);
}

/** Finishes the first login of an account the way the user would (profile + their own password). */
export async function completeFirstLogin(credentials: Credentials, firstName = 'E2E', lastName = 'User'): Promise<void> {
  const ctx = await request.newContext({ baseURL });
  try {
    const login = await ctx.post('auth/login', { data: credentials });
    expect(login.ok(), `login as ${credentials.username}: ${login.status()}`).toBeTruthy();
    const setup = await ctx.post('auth/setup-profile', {
      data: { new_password: credentials.password, first_name: firstName, last_name: lastName },
    });
    expect(setup.ok(), `setup-profile for ${credentials.username}: ${setup.status()} ${await setup.text()}`).toBeTruthy();
  } finally {
    await ctx.dispose();
  }
}
