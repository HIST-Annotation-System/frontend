# E2E tests

Playwright tests for the HistAno web app. They run against a throwaway local stack, never the shared cloud database or the real S3 bucket.

## Running

1. `cp e2e/.env.e2e.example e2e/.env.e2e` (once).
2. `npm run e2e:db` starts Postgres (port 55432) and Adobe S3Mock (port 59000, bucket `e2e-bucket`) in Docker.
3. `npm run e2e` (same as `npx playwright test -c e2e`). Playwright starts the API (`:8001`, `e2e/scripts/run-backend.mjs`, which migrates the database and creates the admin) and Vite (`:5174`) itself. Add `--repeat-each=3` to check that a test is stable.

The API runs from `backend/.venv`, so run `uv sync` in `backend/` first. The accounts come from the `E2E_*` variables in `e2e/.env.e2e`.

## Safety

- Everything is local: API, Vite, Postgres and S3. `e2e/env.ts` refuses non-localhost URLs and port 8000 (the dev API, which uses the cloud database). `run-backend.mjs` sets every database and bucket setting itself, so `backend/.env.local` is never read.
- Tests create their own data through `helpers/api.ts` (`helpers/db.ts` only writes states the app cannot reach without the ML worker or old data) and delete it afterwards.

## Layout

| Path | Purpose |
|---|---|
| `playwright.config.ts` | base URL, html reporter, setup project, servers |
| `auth.setup.ts` | creates the accounts, signs in once per role, saves `auth/<role>.json` (git-ignored) |
| `helpers/api.ts` | API client: organizations, users, folders, hotspot upload, tags, cell types |
| `helpers/db.ts` | the "ML worker has run" and "old non-layered hotspot" states, and catalogue-only slide rows, written into the e2e Postgres |
| `helpers/tiff.ts` | builds a tiny valid tiled TIFF in memory (a few hundred bytes, any size) for slide upload tests |
| `helpers/hotspots.ts`, `helpers/ui.ts` | seeding a folder with hotspots, locating dialogs |
| `pages/` | page objects (login, first login, users, hotspot viewer) |
| `fixtures/` | small PNG/JPEG/text files |
| `*.spec.ts` | the tests, one file per feature |

## Conventions

- Locators: `getByRole` / `getByLabel` / `getByText` first, `getByTestId` only when nothing else names the element. UI strings are the app's own (Polish).
- Web-first assertions; never `waitForTimeout`.
- Each test brings its own data and does not depend on other tests or on what is in the database. Use `unique()` for names.
- Canvas: keep drawing minimal (`page.mouse` relative to the canvas box) and check the saved annotation through the API, not pixels.
- The Jira key goes in the test title, e.g. `test('SCRUM-87: ...')`. Code, test names and comments are English.
- If a test fails because the app is wrong, do not weaken it: mark it `test.fail()` with a comment explaining why.
- Shared global state (priority weights, agreement settings, the default cell type used by the annotation tests) is handled by serial specs that restore the original values.
