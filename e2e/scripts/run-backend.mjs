// Starts the API against the throwaway E2E Postgres: migrate, create the admin account, then serve.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, '..', '.env.e2e');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const need = (name) => {
  if (!process.env[name]) throw new Error(`Missing ${name} (see e2e/.env.e2e.example)`);
  return process.env[name];
};
const apiUrl = new URL(need('E2E_API_URL'));
if (!['localhost', '127.0.0.1'].includes(apiUrl.hostname) || apiUrl.port === '8000') {
  throw new Error(`Refusing to start the E2E API for ${apiUrl.origin}`);
}

// Object storage is the MinIO container of docker-compose.e2e.yml, never the real bucket.
const bucket = {
  BUCKET_ENDPOINT: `http://localhost:${need('E2E_S3_PORT')}`,
  BUCKET_ACCESS_KEY: 'e2e-access',
  BUCKET_SECRET_KEY: 'e2e-secret-key',
  BUCKET_NAME: 'e2e-bucket',
  BUCKET_REGION: 'us-east-1',
};

// Everything else is set explicitly so the backend's own .env.local (your development stack) is never used.
const backendEnv = {
  ...process.env,
  ENVIRONMENT: 'e2e',
  POSTGRES_SERVER: 'localhost',
  POSTGRES_PORT: need('E2E_DB_PORT'),
  POSTGRES_USER: 'e2e',
  POSTGRES_PASSWORD: 'e2e',
  POSTGRES_DB: 'e2e',
  ...bucket,
  SEGMENTATION_ENABLED: 'false',
  JWT_SECRET: 'e2e-secret',
  JWT_ALGORITHM: 'HS256',
  BACKEND_CORS_ORIGINS: JSON.stringify([need('E2E_BASE_URL')]),
  ADMIN_USERNAME: need('E2E_ADMIN_USER'),
  ADMIN_PASSWORD: need('E2E_ADMIN_PASS'),
};

const backend = resolve(here, '..', '..', '..', 'backend');
const bin = resolve(backend, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin');
const exe = (name) => resolve(bin, process.platform === 'win32' ? `${name}.exe` : name);

for (const [command, args] of [
  [exe('alembic'), ['upgrade', 'head']],
  [exe('python'), ['-m', 'scripts.create_admin']],
]) {
  const result = spawnSync(command, args, { cwd: backend, env: backendEnv, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const server = spawn(
  exe('uvicorn'),
  ['app.main:app', '--host', '127.0.0.1', '--port', apiUrl.port, '--no-access-log'],
  { cwd: backend, env: backendEnv, stdio: 'inherit' },
);
server.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill());
