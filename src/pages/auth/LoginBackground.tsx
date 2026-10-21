import { useEffect, useRef, type RefObject } from 'react';
import { useTheme } from '../../context/ThemeProvider';

type CellTypeKey = 'lymphocyte' | 'tumour' | 'fibroblast' | 'macrophage' | 'plasma' | 'endothelial';

const CELL_TYPES: Record<CellTypeKey, { name: string; color: string }> = {
  lymphocyte: { name: 'Limfocyt', color: '#FFD60A' },
  tumour: { name: 'Komórka nowotworowa', color: '#00E5FF' },
  fibroblast: { name: 'Fibroblast', color: '#A6F000' },
  macrophage: { name: 'Makrofag', color: '#FF8A00' },
  plasma: { name: 'Plazmocyt', color: '#00C26E' },
  endothelial: { name: 'Komórka śródbłonka', color: '#2E6BFF' },
};

/** Depth layers: back (small, blurred), middle (sharp, annotated), front (large, blurred). */
type Layer = 0 | 1 | 2;

interface Cell {
  layer: Layer;
  type: CellTypeKey | null;
  x: number;
  y: number;
  r: number;
  elong: number;
  rot: number;
  p1: number;
  p2: number;
  noiseA: number;
  noiseB: number;
  /** Endothelial cells curve gently along their length. */
  bend: number;
  membrane: boolean;
  /** Drawn alpha; cells near the login card fade out to keep a calm zone. */
  alpha: number;
}

interface Highlight {
  cell: Cell;
  t0: number;
  /** Set once the annotation starts fading out (expired, or pushed out by newer ones). */
  fadeStart?: number;
}

interface Colors {
  line: string;
  base: number;
  fillAlpha: number;
  accent: string;
  glow: string;
  handle: string;
  chipBg: string;
  chipFg: string;
  bgCentre: string;
  bgEdge: string;
  vignette: string;
  font: string;
}

interface Band {
  point: (t: number) => [number, number];
  angle: (t: number) => number;
}

const POINTS = 16;
const TRACE_MS = 2800;
const HOLD_MS = 10000;
const FADE_MS = 1200;
const HANDLES_MS = 1200;
const CROSSHAIR_FADE_MS = 400;
const FIRST_PICKS = 3;
const FIRST_PICK_EVERY_MS = 400;
const PICK_EVERY_MS = 1600;
const MAX_TRACING = 2;
const MAX_HIGHLIGHTS = 7;
const STILL_HIGHLIGHTS = 5;
const PICK_SAMPLES = 25;
const RECENT_PICKS = 4;
const EDGE_MARGIN = 60;
const CARD_MARGIN = 40;
const CALM_ZONE = 120;
const DRIFT = 0.005; // px per ms, middle layer
const LAYER_DRIFT = [0.4, 1, 1.6];
const LAYER_ALPHA = [0.45, 1, 0.35];
const LAYER_SCALE = [0.4, 1, 0.35]; // offscreen resolution of the blurred layers
const LAYER_BLUR = ['blur(1px)', 'none', 'blur(1px)']; // in offscreen pixels: ~2.5 px and ~3 px on screen

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

/** `#rrggbb` + alpha (canvas colours); other formats are returned unchanged. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    line: token('--login-line', dark ? '120, 150, 184' : '24, 53, 86'),
    base: dark ? 0.22 : 0.16,
    fillAlpha: dark ? 0.05 : 0.025,
    accent: token('--login-highlight', dark ? '#7FE0E2' : '#1B6F72'),
    glow: withAlpha(token('--login-highlight', dark ? '#7FE0E2' : '#1B6F72'), 0.5),
    handle: dark ? token('--c-page', '#0E1219') : '#FFFFFF',
    chipBg: token('--c-tooltip-bg', dark ? '#E6EAF0' : '#0F1B2A'),
    chipFg: token('--c-tooltip-fg', dark ? '#0F1B2A' : '#E6EAF0'),
    bgCentre: token('--login-bg-from', dark ? '#0E1A2C' : '#E9EDF2'),
    bgEdge: token('--login-bg-to', dark ? '#0B1422' : '#F4F5F7'),
    vignette: dark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(74, 85, 102, 0.12)',
    font: `500 11px ${token('--font-sans', 'system-ui, sans-serif')}`,
  };
}

function pickType(origin: 'band' | 'cluster' | 'scatter'): CellTypeKey {
  const weights: [CellTypeKey, number][] =
    origin === 'band'
      ? [['fibroblast', 4], ['endothelial', 3], ['lymphocyte', 2], ['plasma', 1], ['macrophage', 1], ['tumour', 1]]
      : origin === 'cluster'
        ? [['tumour', 4], ['lymphocyte', 4], ['plasma', 2], ['macrophage', 2], ['fibroblast', 1], ['endothelial', 1]]
        : [['lymphocyte', 3], ['plasma', 2], ['macrophage', 2], ['tumour', 2], ['fibroblast', 2], ['endothelial', 1]];
  let roll = Math.random() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (const [type, w] of weights) {
    roll -= w;
    if (roll <= 0) return type;
  }
  return 'lymphocyte';
}

function makeCell(layer: Layer, type: CellTypeKey | null, x: number, y: number, rot: number): Cell {
  const cell: Cell = {
    layer,
    type,
    x,
    y,
    r: rand(9, 22) * (layer === 0 ? 0.6 : layer === 2 ? 1.6 : 1),
    elong: rand(1, 1.5),
    rot,
    p1: rand(0, Math.PI * 2),
    p2: rand(0, Math.PI * 2),
    noiseA: 0.13,
    noiseB: 0.07,
    bend: 0,
    membrane: false,
    alpha: 1,
  };
  switch (type) {
    case 'lymphocyte':
      Object.assign(cell, { r: rand(6, 9), elong: rand(1, 1.12), noiseA: 0.05, noiseB: 0.03 });
      break;
    case 'tumour':
      Object.assign(cell, { r: rand(16, 24), elong: rand(1, 1.3), noiseA: 0.2, noiseB: 0.12 });
      break;
    case 'fibroblast':
      Object.assign(cell, { r: rand(4.5, 6), elong: rand(3, 4), noiseA: 0.06, noiseB: 0.04 });
      break;
    case 'macrophage':
      Object.assign(cell, { r: rand(11, 15), elong: rand(1.2, 1.4), noiseA: 0.08, noiseB: 0.05 });
      break;
    case 'plasma':
      Object.assign(cell, { r: rand(8, 11), elong: rand(1.3, 1.45), noiseA: 0.06, noiseB: 0.04 });
      break;
    case 'endothelial':
      Object.assign(cell, { r: rand(3.5, 5), elong: rand(3, 4), noiseA: 0.05, noiseB: 0.03, bend: rand(0.35, 0.6) });
      break;
  }
  cell.membrane = layer === 1 && type !== 'fibroblast' && type !== 'endothelial' && Math.random() < 0.35;
  return cell;
}

/** Outline points of a cell (slowly breathing), shaped by its type. */
function cellPoints(cell: Cell, t: number, scale: number, swap = false, timeScale = 1): [number, number][] {
  const p1 = swap ? cell.p2 : cell.p1;
  const p2 = swap ? cell.p1 : cell.p2;
  const tt = t * timeScale;
  const cos = Math.cos(cell.rot);
  const sin = Math.sin(cell.rot);
  const R = cell.r * scale;
  return Array.from({ length: POINTS }, (_, i) => {
    const a = (i / POINTS) * Math.PI * 2;
    let r = R * (1 + cell.noiseA * Math.sin(2 * a + p1 + tt * 0.00035) + cell.noiseB * Math.sin(3 * a + p2 - tt * 0.00025));
    if (cell.type === 'macrophage') r *= 1 - 0.32 * Math.pow(Math.max(0, Math.sin(a)), 6); // kidney dent
    const px = Math.cos(a) * r * cell.elong;
    let py = Math.sin(a) * r;
    if (cell.type === 'fibroblast') py *= 1 - 0.65 * Math.pow(Math.abs(Math.cos(a)), 1.2); // spindle
    if (cell.type === 'endothelial') {
      py *= 1 - 0.4 * Math.abs(Math.cos(a));
      const along = px / (R * cell.elong);
      py += cell.bend * R * along * along;
    }
    return [cell.x + px * cos - py * sin, cell.y + px * sin + py * cos];
  });
}

/** Closed smooth curve through the points (quadratic curves between midpoints). */
function smoothPath(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  const n = pts.length;
  const mid = (i: number): [number, number] => {
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  ctx.beginPath();
  const start = mid(n - 1);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  ctx.closePath();
}

/** Polyline through the outline up to `frac` of its length; returns the drawing tip. */
function partialPolyline(ctx: CanvasRenderingContext2D, pts: [number, number][], frac: number): [number, number] {
  const n = pts.length;
  const segs = frac * n;
  const full = Math.floor(segs);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= Math.min(full, n); i++) ctx.lineTo(pts[i % n][0], pts[i % n][1]);
  if (frac >= 1) {
    ctx.closePath();
    return pts[0];
  }
  const a = pts[full % n];
  const b = pts[(full + 1) % n];
  const f = segs - full;
  const tip: [number, number] = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  ctx.lineTo(tip[0], tip[1]);
  return tip;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Gentle curves across the screen that cells and stroma fibres line up along. */
function makeBands(width: number, height: number): Band[] {
  const count = 2 + Math.round(Math.random());
  return Array.from({ length: count }, (_, i) => {
    const p0: [number, number] = [-0.1 * width, height * ((i + 0.5) / count) + rand(-0.12, 0.12) * height];
    const c: [number, number] = [width * rand(0.3, 0.7), height * rand(-0.1, 1.1)];
    const p2: [number, number] = [1.1 * width, height * rand(0.1, 0.9)];
    return {
      point: (t) => [
        (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0],
        (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1],
      ],
      angle: (t) =>
        Math.atan2(2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]), 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0])),
    };
  });
}

interface LoginBackgroundProps {
  /** The login card: the calm zone is around it and annotations stay away from it. */
  avoidRef: RefObject<HTMLElement | null>;
}

/** A slide-like field of cells in three depth layers; cells get "annotated" one after another. */
export default function LoginBackground({ avoidRef }: LoginBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, palette } = useTheme();
  const repaintRef = useRef<() => unknown>(() => undefined);

  useEffect(() => {
    repaintRef.current();
  }, [theme, palette]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const backdrop = document.createElement('canvas'); // gradient + stroma fibres
    const vignette = document.createElement('canvas');
    const layerCanvas = { 0: document.createElement('canvas'), 2: document.createElement('canvas') };
    const layerBlurred = { 0: document.createElement('canvas'), 2: document.createElement('canvas') };

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let colors = readColors();
    let fibres: [number, number][][] = [];
    let cells: Cell[] = [];
    let highlights: Highlight[] = [];
    let recentPicks: { x: number; y: number }[] = [];
    let firstPicksLeft = FIRST_PICKS;
    let nextPickAt = 0;
    let lastFrame = 0;
    let hiddenAt = 0;
    let card: { l: number; r: number; t: number; b: number } | null = null;
    const driftAngle = rand(0, Math.PI * 2);
    const driftX = Math.cos(driftAngle) * DRIFT;
    const driftY = Math.sin(driftAngle) * DRIFT;

    const measureCard = () => {
      const rect = avoidRef.current?.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      card = rect
        ? { l: rect.left - rootRect.left, r: rect.right - rootRect.left, t: rect.top - rootRect.top, b: rect.bottom - rootRect.top }
        : null;
    };

    const cardDistance = (x: number, y: number) => {
      if (!card) return Infinity;
      const dx = Math.max(card.l - x, 0, x - card.r);
      const dy = Math.max(card.t - y, 0, y - card.b);
      return Math.hypot(dx, dy);
    };

    const paintBackdrop = () => {
      for (const target of [backdrop, vignette]) {
        target.width = Math.round(width * dpr);
        target.height = Math.round(height * dpr);
      }
      const b = backdrop.getContext('2d');
      const v = vignette.getContext('2d');
      if (!b || !v) return;
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      const radius = Math.hypot(width, height) / 2;
      const gradient = b.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius);
      gradient.addColorStop(0, colors.bgCentre);
      gradient.addColorStop(1, colors.bgEdge);
      b.fillStyle = gradient;
      b.fillRect(0, 0, width, height);
      b.strokeStyle = `rgba(${colors.line}, 0.06)`;
      b.lineWidth = 1;
      for (const fibre of fibres) {
        b.beginPath();
        fibre.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
        b.stroke();
      }

      v.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vg = v.createRadialGradient(width / 2, height / 2, radius * 0.45, width / 2, height / 2, radius);
      vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vg.addColorStop(1, colors.vignette);
      v.fillStyle = vg;
      v.fillRect(0, 0, width, height);
    };

    const placeCells = () => {
      const bands = makeBands(width, height);
      fibres = bands.flatMap((band) =>
        Array.from({ length: 5 }, () => {
          const offset = rand(-90, 90);
          const amp = rand(3, 8);
          const wave = rand(80, 140);
          const phase = rand(0, Math.PI * 2);
          return Array.from({ length: 80 }, (_, i): [number, number] => {
            const t = i / 79;
            const [x, y] = band.point(t);
            const normal = band.angle(t) + Math.PI / 2;
            const shift = offset + amp * Math.sin((t * width) / wave + phase);
            return [x + Math.cos(normal) * shift, y + Math.sin(normal) * shift];
          });
        }),
      );

      const clusters = Array.from({ length: 5 }, () => [rand(0.05, 0.95) * width, rand(0.05, 0.95) * height]);
      const sample = (): { x: number; y: number; rot: number; origin: 'band' | 'cluster' | 'scatter' } => {
        const roll = Math.random();
        if (roll < 0.55) {
          const band = bands[Math.floor(Math.random() * bands.length)];
          const t = Math.random();
          const [bx, by] = band.point(t);
          const angle = band.angle(t);
          const off = gauss() * 55;
          return { x: bx - Math.sin(angle) * off, y: by + Math.cos(angle) * off, rot: angle + rand(-0.3, 0.3), origin: 'band' };
        }
        if (roll < 0.8) {
          const [cx, cy] = clusters[Math.floor(Math.random() * clusters.length)];
          return { x: cx + gauss() * 50, y: cy + gauss() * 50, rot: rand(0, Math.PI * 2), origin: 'cluster' };
        }
        return { x: rand(0, width), y: rand(0, height), rot: rand(0, Math.PI * 2), origin: 'scatter' };
      };

      const area = width * height;
      const placed: Cell[] = [];
      const reachOf = (c: Cell) => c.r * Math.max(1, c.elong * 0.75);
      const fill = (layer: Layer, target: number, spacing: number) => {
        let attempts = 0;
        let count = 0;
        while (count < target && attempts < target * 40) {
          attempts++;
          const s = sample();
          if (s.x < -20 || s.y < -20 || s.x > width + 20 || s.y > height + 20) continue;
          if (layer === 1 && Math.random() > Math.min(1, cardDistance(s.x, s.y) / CALM_ZONE)) continue;
          const cell = makeCell(layer, layer === 1 ? pickType(s.origin) : null, s.x, s.y, s.rot);
          const crowded = placed.some(
            (o) => o.layer === layer && Math.hypot(o.x - cell.x, o.y - cell.y) < spacing * (reachOf(cell) + reachOf(o)),
          );
          if (crowded) continue;
          placed.push(cell);
          count++;
        }
      };
      fill(1, Math.round(area / 9000), 1.3);
      fill(0, Math.round(area / 6500), 1.1);
      fill(2, Math.round(area / 70000), 1.2);
      cells = placed;
    };

    const eligible = (c: Cell) => {
      const reach = c.r * c.elong * 1.4;
      return (
        c.layer === 1 &&
        c.type !== null &&
        c.x - reach > EDGE_MARGIN &&
        c.y - reach > EDGE_MARGIN + 24 &&
        c.x + reach < width - EDGE_MARGIN &&
        c.y + reach < height - EDGE_MARGIN &&
        cardDistance(c.x, c.y) > reach + CARD_MARGIN + 24
      );
    };

    const pickHighlight = (now: number) => {
      const busy = new Set(highlights.map((h) => h.cell));
      const pool = cells.filter((c) => !busy.has(c) && eligible(c));
      if (!pool.length) return;
      // Alternate sides of the card (left/right and top/bottom) when the screen allows it.
      const centreX = card ? (card.l + card.r) / 2 : width / 2;
      const centreY = card ? (card.t + card.b) / 2 : height / 2;
      const last = recentPicks[recentPicks.length - 1];
      const sided = last
        ? pool.filter((c) => c.x < centreX !== last.x < centreX && c.y < centreY !== last.y < centreY)
        : [];
      const leftRight = last ? pool.filter((c) => c.x < centreX !== last.x < centreX) : [];
      const candidates = sided.length ? sided : leftRight.length ? leftRight : pool;
      // Farthest-point choice: of random candidates, take the one farthest from current and recent annotations.
      const others = [...highlights.map((h) => ({ x: h.cell.x, y: h.cell.y })), ...recentPicks];
      let best = candidates[Math.floor(Math.random() * candidates.length)];
      let bestDistance = -1;
      for (let i = 0; i < PICK_SAMPLES; i++) {
        const candidate = candidates[Math.floor(Math.random() * candidates.length)];
        const distance = others.length
          ? Math.min(...others.map((o) => Math.hypot(o.x - candidate.x, o.y - candidate.y)))
          : Math.random();
        if (distance > bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
      const live = highlights.filter((h) => h.fadeStart === undefined);
      if (live.length >= MAX_HIGHLIGHTS) live[0].fadeStart = now;
      recentPicks = [...recentPicks, { x: best.x, y: best.y }].slice(-RECENT_PICKS);
      highlights.push({ cell: best, t0: now });
    };

    const drawCell = (target: CanvasRenderingContext2D, cell: Cell, now: number) => {
      const { line, base, fillAlpha } = colors;
      const alpha = cell.alpha;
      if (cell.membrane) {
        smoothPath(target, cellPoints(cell, now, 1.5, true, 0.7));
        target.strokeStyle = `rgba(${line}, ${base * 0.35 * alpha})`;
        target.lineWidth = 1;
        target.stroke();
      }
      smoothPath(target, cellPoints(cell, now, 1));
      const dense = cell.type === 'lymphocyte' ? 2 : 1;
      target.fillStyle = `rgba(${line}, ${fillAlpha * 2.2 * dense * alpha})`;
      target.fill();
      target.strokeStyle = `rgba(${line}, ${base * 1.5 * alpha})`;
      target.lineWidth = 1;
      target.stroke();

      if (cell.type === 'tumour' || cell.type === 'plasma') {
        const cos = Math.cos(cell.rot);
        const sin = Math.sin(cell.rot);
        // Tumour: small nucleolus; plasma cell: eccentric nucleus.
        const [ox, oy, rr] =
          cell.type === 'tumour' ? [cell.r * 0.2, -cell.r * 0.15, 2.2] : [cell.r * cell.elong * 0.42, 0, cell.r * 0.5];
        target.beginPath();
        target.arc(cell.x + ox * cos - oy * sin, cell.y + ox * sin + oy * cos, rr, 0, Math.PI * 2);
        target.fillStyle = `rgba(${line}, ${(cell.type === 'tumour' ? base * 2 : fillAlpha * 4) * alpha})`;
        target.fill();
        if (cell.type === 'plasma') {
          target.strokeStyle = `rgba(${line}, ${base * alpha})`;
          target.stroke();
        }
      }
    };

    const drawBlurredLayer = (layer: 0 | 2, now: number) => {
      const small = layerCanvas[layer];
      const blurred = layerBlurred[layer];
      const s = small.getContext('2d');
      const b = blurred.getContext('2d');
      if (!s || !b) return;
      const scale = LAYER_SCALE[layer];
      s.setTransform(scale, 0, 0, scale, 0, 0);
      s.clearRect(0, 0, width, height);
      for (const cell of cells) if (cell.layer === layer) drawCell(s, cell, now);
      b.clearRect(0, 0, blurred.width, blurred.height);
      b.filter = LAYER_BLUR[layer];
      b.drawImage(small, 0, 0);
      b.filter = 'none';
      ctx.globalAlpha = LAYER_ALPHA[layer];
      ctx.drawImage(blurred, 0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    const drawHighlight = (h: Highlight, now: number, still: boolean, newest: boolean) => {
      const elapsed = still ? TRACE_MS + HANDLES_MS + CROSSHAIR_FADE_MS : now - h.t0;
      const fade = h.fadeStart === undefined ? 1 : Math.max(0, 1 - (now - h.fadeStart) / FADE_MS);
      const pts = cellPoints(h.cell, now, 1.12);
      const closed = elapsed >= TRACE_MS;

      ctx.globalAlpha = fade;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = 'round';
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 6;
      const tip = partialPolyline(ctx, pts, closed ? 1 : ease(elapsed / TRACE_MS));
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (closed) {
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = fade * 0.12;
        ctx.fill();
        ctx.globalAlpha = fade;
      }

      // Crosshair at the drawing tip, fading out once the outline closes.
      const crossAlpha = closed ? 1 - (elapsed - TRACE_MS) / CROSSHAIR_FADE_MS : 1;
      if (crossAlpha > 0) {
        ctx.globalAlpha = fade * 0.85 * crossAlpha;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          ctx.moveTo(tip[0] + dx * 3, tip[1] + dy * 3);
          ctx.lineTo(tip[0] + dx * 7, tip[1] + dy * 7);
        }
        ctx.stroke();
        ctx.globalAlpha = fade;
      }
      if (!closed) {
        ctx.globalAlpha = 1;
        return;
      }

      // Edit handles only on the newest annotation, briefly, like a selection that then moves on.
      if (newest && !still && elapsed - TRACE_MS < HANDLES_MS) {
        ctx.lineWidth = 1;
        for (let i = 0; i < POINTS; i += 2) {
          const p = pts[i];
          ctx.fillStyle = colors.handle;
          ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
          ctx.strokeRect(p[0] - 3, p[1] - 3, 6, 6);
        }
      }

      if (h.cell.type) {
        const type = CELL_TYPES[h.cell.type];
        const top = pts.reduce((best, p) => (p[1] < best[1] ? p : best), pts[0]);
        ctx.font = colors.font;
        const chipW = ctx.measureText(type.name).width + 8 + 7 + 6 + 8;
        const chipX = top[0] - chipW / 2;
        const chipY = top[1] - 10 - 20;
        ctx.fillStyle = colors.chipBg;
        roundRect(ctx, chipX, chipY, chipW, 20, 4);
        ctx.fill();
        ctx.fillStyle = type.color;
        ctx.beginPath();
        ctx.arc(chipX + 8 + 3.5, chipY + 10, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.chipFg;
        ctx.textBaseline = 'middle';
        ctx.fillText(type.name, chipX + 8 + 7 + 6, chipY + 10.5);
      }
      ctx.globalAlpha = 1;
    };

    const draw = (now: number, still = false) => {
      ctx.drawImage(backdrop, 0, 0, width, height);
      drawBlurredLayer(0, now);
      for (const cell of cells) {
        if (cell.layer !== 1) continue;
        cell.alpha = Math.min(1, 0.1 + cardDistance(cell.x, cell.y) / CALM_ZONE);
        drawCell(ctx, cell, now);
      }
      highlights.forEach((h, i) => drawHighlight(h, now, still, i === highlights.length - 1));
      drawBlurredLayer(2, now);
      ctx.drawImage(vignette, 0, 0, width, height);
    };

    const paintStill = () => {
      if (!highlights.length) for (let i = 0; i < STILL_HIGHLIGHTS; i++) pickHighlight(0);
      draw(0, true);
    };

    const layout = () => {
      width = root.clientWidth;
      height = root.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const layer of [0, 2] as const) {
        for (const target of [layerCanvas[layer], layerBlurred[layer]]) {
          target.width = Math.max(1, Math.round(width * LAYER_SCALE[layer]));
          target.height = Math.max(1, Math.round(height * LAYER_SCALE[layer]));
        }
      }
      measureCard();
      placeCells();
      paintBackdrop();
      highlights = [];
      recentPicks = [];
      firstPicksLeft = FIRST_PICKS;
      nextPickAt = performance.now();
      if (reduceMotion) paintStill();
    };

    const step = (now: number) => {
      const dt = lastFrame ? Math.min(50, now - lastFrame) : 0;
      lastFrame = now;
      for (const cell of cells) {
        const speed = LAYER_DRIFT[cell.layer];
        cell.x += driftX * speed * dt;
        cell.y += driftY * speed * dt;
        const pad = cell.r * cell.elong * 2;
        if (cell.x < -pad) cell.x = width + pad;
        else if (cell.x > width + pad) cell.x = -pad;
        if (cell.y < -pad) cell.y = height + pad;
        else if (cell.y > height + pad) cell.y = -pad;
      }
      for (const h of highlights) {
        if (h.fadeStart === undefined && (now - h.t0 > TRACE_MS + HOLD_MS || !eligible(h.cell))) h.fadeStart = now;
      }
      highlights = highlights.filter((h) => h.fadeStart === undefined || now - h.fadeStart < FADE_MS);
      const tracing = highlights.filter((h) => now - h.t0 < TRACE_MS).length;
      if (now >= nextPickAt && tracing < (firstPicksLeft > 0 ? FIRST_PICKS : MAX_TRACING)) {
        pickHighlight(now);
        if (firstPicksLeft > 0) firstPicksLeft--;
        nextPickAt = now + (firstPicksLeft > 0 ? FIRST_PICK_EVERY_MS : PICK_EVERY_MS);
      }
      draw(now);
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (reduceMotion || raf || document.hidden) return;
      lastFrame = 0;
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
        stop();
        return;
      }
      // Resume where it stopped instead of jumping ahead by the hidden time.
      const pause = hiddenAt ? performance.now() - hiddenAt : 0;
      for (const h of highlights) {
        h.t0 += pause;
        if (h.fadeStart !== undefined) h.fadeStart += pause;
      }
      nextPickAt += pause;
      start();
    };

    // ThemeProvider sets data-theme in its own (later) effect, so read the tokens on the next frame.
    repaintRef.current = () =>
      requestAnimationFrame(() => {
        colors = readColors();
        paintBackdrop();
        if (reduceMotion) paintStill();
      });

    layout();
    const observer = new ResizeObserver(() => {
      if (root.clientWidth !== width || root.clientHeight !== height) layout();
      else measureCard();
    });
    observer.observe(root);
    if (avoidRef.current) observer.observe(avoidRef.current);
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      repaintRef.current = () => undefined;
    };
  }, [avoidRef]);

  return (
    <div ref={rootRef} className="auth-bg" aria-hidden="true">
      <canvas ref={canvasRef} className="auth-bg__layer" />
    </div>
  );
}
