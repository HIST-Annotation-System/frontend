# Frontend - WSI viewer (React + TypeScript + Vite)

Web client for browsing, viewing and annotating Whole Slide Images. Slides are rendered with
**OpenSeadragon 6** (Deep Zoom tiles served by the backend), and polygon annotations are drawn with
**Annotorious 3** on top of the same viewer.

## Requirements

- Node.js 22+ and npm
- The backend running (see `../backend/README.md`), by default at `http://localhost:8000`

## Setup

```bash
npm install
cp .env.example .env.local   # optional; VITE_API_URL defaults to http://localhost:8000/api/v1
npm run dev                  # http://localhost:5173 (allowed by the backend's CORS settings)
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with HMR |
| `npm run build` | Strict type check (`tsc -b`) and production build |
| `npm run lint` | Oxlint |
| `npm test` | Vitest unit tests |

## Features

- **Slide library** (`/`) - upload slides (chunked upload straight to object storage) and browse them
  with thumbnails and processing status. MRXS slides must be uploaded as a `.zip` containing the `.mrxs`
  file and its data folder.
- **Viewer** (`/slides/:slideId`) - Deep Zoom navigation that opens focused on the detected tissue,
  magnification presets (1× … native objective), zoom / fit / 1:1, live magnification in the status
  bar, navigator minimap, slide metadata with all OpenSlide properties, and export of the visible
  region as PNG.
- **Annotations** - polygon drawing with a tissue class, vertex editing, class changes and deletion
  from the list, undo/redo (buttons or Ctrl+Z / Ctrl+Y), and GeoJSON export (QuPath-style properties).
  Every change is saved to the backend immediately.

Drawing: pick a class (or switch to *Poligon*), click to add vertices, click the first vertex or
double-click to close; Esc cancels. In *Nawigacja* mode, click a shape to select and edit it.

## Structure

```
src/
  assets/styles/   design tokens and global styles
  components/      reusable UI (ui/) and the app layout (layout/)
  context/         React context providers (TanStack Query client)
  features/        slides, upload, viewer, annotations - components, hooks and helpers per domain
  hooks/           reusable hooks (OpenSeadragon events, downloads, latest-value ref)
  pages/           routed views: SlidesPage, SlideViewerPage, NotFound
  services/        API client (httpClient) and endpoint modules
  types/           shared TypeScript types (API contracts, geometry)
  utils/           pure helpers (coordinates, geometry, magnification, formatting)
```

Server data (slides, annotations, classes) is managed with **TanStack Query**; UI state stays in the
components and hooks that use it.

### Coordinates

The API stores annotations as GeoJSON polygons in **level-0 slide pixels**. The viewer works in Deep
Zoom image pixels, which differ by the slide's `image_offset` when the backend crops the empty area
around a scan. `features/annotations/utils/annotationAdapter.ts` (an Annotorious format adapter) and
`utils/coordinates.ts` are the only places that convert between the two.

### Annotation sync

`features/annotations/hooks/useAnnotoriousSync.ts` keeps Annotorious and the API in sync: annotations
are loaded once, user edits are sent to the API in order per annotation, and rolled back in the viewer
if a request fails. The annotator's own UUID is used as the annotation id, so undo/redo always refer
to the same server record.
