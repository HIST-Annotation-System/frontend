import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { Api, unique } from './api';

const PNG = readFileSync('e2e/fixtures/hotspot.png');

export type SeededFolder = { id: string; name: string; hotspots: { id: string; name: string }[] };

/** A folder with one uploaded fixture image per name (sequentially, so the creation order is the given order). */
export async function seedFolder(api: Api, names: string[], organizationId?: number): Promise<SeededFolder> {
  const folder = await api.createFolder(unique('folder'), organizationId);
  const hotspots: SeededFolder['hotspots'] = [];
  for (const name of names) {
    hotspots.push(await api.uploadHotspot(folder.id, { name: `${name}.png`, mimeType: 'image/png', buffer: PNG }));
  }
  return { id: folder.id, name: folder.name, hotspots };
}

/** Deletes the hotspots first, so their images leave the bucket too, then the folder. Retries S3 hiccups. */
export async function removeFolder(api: Api, folder: SeededFolder): Promise<void> {
  const remaining = await api.get<{ id: string }[]>(`hotspots?folder_id=${folder.id}`).catch(() => []);
  const ids = new Set([...folder.hotspots.map((item) => item.id), ...remaining.map((item) => item.id)]);
  for (const id of ids) {
    await expect(async () => {
      const status = (await api.ctx.delete(`hotspots/${id}`)).status();
      expect([204, 404], `delete hotspot ${id}`).toContain(status);
    }).toPass({ timeout: 30_000 });
  }
  await api.ctx.delete(`hotspot-folders/${folder.id}`);
}
