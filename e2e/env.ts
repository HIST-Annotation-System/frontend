import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = resolve(import.meta.dirname, '.env.e2e');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const read = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy e2e/.env.e2e.example to e2e/.env.e2e.`);
  return value;
};

export const env = {
  baseUrl: read('E2E_BASE_URL'),
  apiUrl: read('E2E_API_URL'),
  dbPort: Number(read('E2E_DB_PORT')),
  admin: { username: read('E2E_ADMIN_USER'), password: read('E2E_ADMIN_PASS') },
  orgAdmin: { username: read('E2E_ORGADMIN_USER'), password: read('E2E_ORGADMIN_PASS') },
  annotator: { username: read('E2E_ANNOTATOR_USER'), password: read('E2E_ANNOTATOR_PASS') },
};

// The suite writes to whatever it points at, so refuse anything but the local E2E stack.
for (const url of [env.baseUrl, env.apiUrl]) {
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
    throw new Error(`E2E only runs against localhost, got ${url}`);
  }
}
if (new URL(env.apiUrl).port === '8000') {
  throw new Error('Port 8000 is the dev API, which uses the shared cloud database. Use the E2E API on 8001.');
}
