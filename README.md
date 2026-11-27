# HistAno frontend

The web app of HistAno, built with **React 19**, **TypeScript** and **Vite**. Users upload and browse whole slide
images, view them with **OpenSeadragon** (Deep Zoom tiles from the backend), choose hotspots on them, and annotate the
cells of each hotspot with **Annotorious**. Managers handle users, agreement settings and the shared dictionaries in an
admin panel. The interface is in Polish.

## HistAno

HistAno is a system for annotating cells in histopathology slides: a model outlines and classifies the cells of each
hotspot first, and experts correct its work instead of drawing every cell from scratch. It is split into three
repositories:

| Repository | What it is |
|---|---|
| [backend](https://github.com/HIST-Annotation-System/backend) | The API, its database and storage; the AWS infrastructure (`infra/`) |
| [frontend](https://github.com/HIST-Annotation-System/frontend) | This web app |
| [ml-worker](https://github.com/HIST-Annotation-System/ml-worker) | The GPU worker that segments cells with Classpose (optional) |

Clone them side by side in one folder (`backend/`, `frontend/`, `ml-worker/`): the end-to-end tests run the API from
`../backend`. The backend's README describes the architecture.

## Quick start

Requirements: Node.js 22 and npm, and the backend's local stack running (see its
[Quick start](https://github.com/HIST-Annotation-System/backend#quick-start)), which serves the API at
`http://localhost:8000`.

```bash
npm install
cp .env.example .env.local   # optional: the defaults point at the local API
npm run dev                  # http://localhost:5173
```

Log in with the backend's `ADMIN_USERNAME` / `ADMIN_PASSWORD` (`admin` / `admin123` in its `.env.example`).

## Development

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Strict type check (`tsc -b`) and production build into `dist/` |
| `npm run preview` | Serves `dist/` locally |
| `npm run lint` | [Oxlint](https://oxc.rs/docs/guide/usage/linter) |
| `npm test` | Unit tests ([Vitest](https://vitest.dev/)), next to the code as `*.test.ts` |
| `npm run e2e:db`, `npm run e2e` | End-to-end tests ([Playwright](https://playwright.dev/)) against a throwaway stack; see [`e2e/README.md`](e2e/README.md) |

CI runs `lint`, `build` and `test` on every pull request; run them before pushing.

### Project structure

```text
src/
  App.tsx          routes and the role each one needs
  pages/           routed views; admin/ (admin panel) and auth/ (login, first login, profile)
  features/        one folder per domain, each with components/, hooks/ and utils/:
                   slides, upload, viewer, hotspots, annotations, reannotation, organizations, users, stats
  components/      shared UI (ui/) and the app layout (layout/)
  context/         providers: auth, TanStack Query, theme, upload queues
  hooks/           reusable hooks (OpenSeadragon events, downloads, document title, ...)
  services/        the API client (httpClient.ts) and one module per backend resource
  types/           shared TypeScript types (API contracts, geometry)
  utils/           pure helpers (coordinates, geometry, magnification, formatting, errors)
  assets/          design tokens, global styles, brand assets
e2e/               Playwright end-to-end tests
```

Server data is managed with **TanStack Query** (`features/*/hooks`); UI state stays in the components and hooks that
use it. Lists poll only while something is processing, and refresh when the window regains focus.

### Coordinates

The backend stores annotations as GeoJSON polygons in the pixels of their hotspot image, and slide positions in
level-0 slide pixels. The slide viewer works in Deep Zoom image pixels, which differ from slide pixels by the slide's
`image_offset` when the backend crops the empty area around a scan. `features/annotations/utils/annotationAdapter.ts`
(an Annotorious format adapter) and `utils/coordinates.ts` are the only places that convert between them.

### Annotation sync

`features/annotations/hooks/useAnnotoriousSync.ts` keeps Annotorious and the API in sync: annotations are loaded
once, every edit (draw, reshape, delete, undo/redo) is sent to the API in order per annotation, and rolled back in the
viewer if the request fails. The annotator's own UUID is the annotation id, so undo/redo always refer to the same
server record.

### Slides that are still being copied

The backend copies a slide to its disk on first view and answers `503 slide_preparing` meanwhile
(`features/viewer/hooks/useSlideImage.ts`). The viewer shows that the server is copying the slide and retries by
itself; failed tiles are retried too (`features/viewer/viewerOptions.ts`).

## Configuration

Vite reads `VITE_*` variables at build time from `.env.local` (gitignored) or the environment:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | The API; production builds use `/api/v1` (same origin) |
| `VITE_UPLOAD_CONCURRENCY` | `4` | Parts of a slide uploaded in parallel (1-8) |

The local API allows the origin `http://localhost:5173` (the backend's `BACKEND_CORS_ORIGINS`).

## Features

| Route | Who | What |
|---|---|---|
| `/login`, `/setup` | Everyone | Login; on first login, a new password and profile |
| `/` | Everyone | Slide library: chunked, resumable uploads straight to object storage, thumbnails and processing status |
| `/slides/:slideId` | Everyone | Slide viewer: opens on the detected tissue, magnification presets, minimap, metadata, PNG export of the visible region; choosing squares to cut out as hotspots |
| `/hotspots` | Everyone | Hotspot catalog: folders, filters, sorting (estimated priority, image descriptors, model uncertainty, tags), bulk tagging, uploading hotspot images |
| `/hotspots/:hotspotId` | Everyone | Hotspot viewer: cell annotation with cell types and excluded areas, the model's cells, reannotation layers and confirmation, agreement, tags, GeoJSON export; undo/redo (Ctrl+Z / Ctrl+Y), Esc cancels |
| `/profile` | Everyone | Own profile and password |
| `/admin/users`, `/admin/agreement` | `ADMIN`, `ORG_ADMIN` | Users of the organization, agreement metric and threshold |
| `/admin/organizations`, `/admin/cell-types`, `/admin/tags`, `/admin/priority-weights`, `/admin/stats` | `ADMIN` | Organizations and the dictionaries shared by all of them; statistics |

## Deployment

Every push to `main` deploys (`.github/workflows/deploy.yml`, after the same checks as CI): the app is built with
`VITE_API_URL=/api/v1` and copied to an S3 bucket behind CloudFront, which serves it and routes `/api/*` to the
backend, so the page and the API share one origin and need no CORS. Hashed files under `assets/` are cached forever,
`index.html` never. The workflow reads `AWS_ROLE_ARN`, `FRONTEND_BUCKET` and `DISTRIBUTION_ID` from the repository's
variables and gets temporary AWS credentials through GitHub OIDC. The AWS resources are Terraform in the backend
repository's `infra/`.

## Contributing

- `main` is production: every push to it deploys. `dev` is the integration branch.
- Branch off `dev` (`feat/<topic>`, `bugfix/<topic>`) and open a pull request into `dev`. CI
  (`.github/workflows/ci.yml`) runs on every pull request and every push to `dev`.
- Release by opening a pull request from `dev` into `main`. A change that needs a new API goes out after the backend's.
- Commit messages: `<type>: <summary>`, with `feat`, `bugfix`, `perf`, `test`, `style`, `docs` or `infra`.
- Code, comments and test names are in English; UI strings are in Polish.

## License

[MIT](LICENSE).
