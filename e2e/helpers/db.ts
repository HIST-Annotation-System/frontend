import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { env } from '../env';

// Slides are only created by uploading a real WSI file, which the suite does not do, so catalogue rows are inserted
// directly into the throwaway E2E Postgres. They have no file in S3: lists and filters work, tiles do not.
// Hotspots are not inserted here; upload a fixture through Api.uploadHotspot.
async function withDb<T>(run: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ host: 'localhost', port: env.dbPort, user: 'e2e', password: 'e2e', database: 'e2e' });
  await db.connect();
  try {
    return await run(db);
  } finally {
    await db.end();
  }
}

export const insertSlide = (organizationId: number, name: string, status = 'ready'): Promise<string> =>
  withDb(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO slides (id, name, original_filename, storage_key, status, organization_id, image_offset, properties)
       VALUES ($1, $2, $2, $3, $4, $5, '{"x":0,"y":0}', '{}')`,
      [id, name, `e2e/${id}`, status, organizationId],
    );
    return id;
  });

export const deleteSlide = (id: string): Promise<void> =>
  withDb(async (db) => {
    await db.query('DELETE FROM slides WHERE id = $1', [id]);
  });

// A hotspot stays `pending` until the ML worker has run, and a pending hotspot cannot be annotated in the UI. The
// worker is not part of the E2E stack, so tests put the hotspot in the state the worker leaves it in.
export const markSegmentationDone = (hotspotId: string): Promise<void> =>
  withDb(async (db) => {
    await db.query("UPDATE hotspots SET segmentation_status = 'done' WHERE id = $1", [hotspotId]);
  });

// Hotspots annotated in the old shared way (before layers per annotator) have `layered = false`; new ones cannot be
// made that way through the app, so the old state is written directly.
export const markLegacyHotspot = (hotspotId: string): Promise<void> =>
  withDb(async (db) => {
    await db.query("UPDATE hotspots SET layered = false, segmentation_status = 'done' WHERE id = $1", [hotspotId]);
  });

// The model's mean confidence in a hotspot's cells comes from the ML worker, which is not part of the E2E stack.
export const setModelConfidence = (hotspotId: string, outline: number, cellTypes: number): Promise<void> =>
  withDb(async (db) => {
    await db.query(
      "UPDATE hotspots SET segmentation_status = 'done', model_outline_confidence = $2, model_class_confidence = $3 WHERE id = $1",
      [hotspotId, outline, cellTypes],
    );
  });
