// What is lettered over the chart, in HTML and SVG rather than in WebGL: the constellation
// names (each a real button, lettered along a curve), the rings round the reader's own
// pieces, The Uncharted at the rim, the ruled border, and the word of a star under the
// pointer. Everything is placed from the same projection as the stars.

import { CONSTELLATIONS } from '../../data/vocab';
import { STARS, extent, spokenPiece, starFor } from '../../data/chart';
import { svgEl } from '../../components/marks';
import { projector, pxPerUnit, type Vec3, type View } from '../../lib/projection';
import { rand, rngFor, signed } from '../../motion/random';
import { symbolScale } from './renderer';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export interface Frame {
  width: number;
  height: number;
  /** The strip at the foot of the field kept for The Uncharted and the loupe toggle. */
  band: number;
}

export interface OverlayState {
  /** Per constellation, 0–1: how far its name has been lettered. */
  lettered: Float32Array;
  /** Names of constellations off the field are set at its border, pointing the way. */
  edges: boolean;
  /** The constellation the camera is visiting, if any: its name goes first. */
  focus: string | null;
  /** 0–1: the rings round the reader's pieces, drawn. */
  rings: number;
  /** 0–1: the border and The Uncharted, exposed. */
  border: number;
  /** Stars whose words are set beside them (the words a stop's caption names), and how strongly. */
  labels: readonly number[];
  labelled: number;
}

interface Name {
  id: string;
  button: HTMLButtonElement;
  art: SVGSVGElement;
  w: number;
  h: number;
  top: number;
  tilt: number;
  centroid: Vec3;
  radius: number;
  placed: string;
}

interface Ring {
  star: number;
  g: SVGGElement;
  path: SVGPathElement;
  label: SVGTextElement;
}

interface Label {
  el: HTMLSpanElement;
  star: number;
  w: number;
  h: number;
}

type Box = { l: number; t: number; r: number; b: number };
const overlaps = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

const TICK_STEP = 18;       // px between the border's degree ticks
const LABEL_GAP = 6;        // px between a constellation's top star and its name
const HOVER_OFFSET = 10;    // px from a star to its word
/** px about a star, by magnitude, that no word may cover. */
const STAR_ROOM = [0, 7, 7, 4.5, 4.5, 2.5, 2.5];
/** Names set at the border, pointing the way, are set a size smaller than names over their stars. */
const EDGE_SCALE = 0.86;
/** Below this width the field is a phone's: fewer names, and The Uncharted above the toggle. */
const NARROW = 560;
/** How many names may point the way from the border, on a wide field and a narrow one. */
const EDGES = { wide: 10, narrow: 4 };
const STOPS = ['laurel', 'chest', 'wardrobe', 'rule', 'centre'];
/** The faintest magnitude a name may not be printed over (fainter ones it may). */
const FAINT = 3;
/** px a border name moves at a time as it looks for room. */
const SLIDE_STEP = 26;
const WORD_GAP = 10;        // px from a star to the word set beside it
const YOURS = { w: 40, h: 18, gap: 21 };
/** A reader's ring lies outside even the brightest symbol's rays (on a wide field). */
const RING_RADIUS = 16;

/** Beside a point, the first of a few places that is free: right, left, above right, below left… */
function beside(x: number, y: number, w: number, h: number, gap: number, bounds: Box, taken: Box[]): Box | null {
  const places: [number, number][] = [
    [gap, -h / 2],
    [-gap - w, -h / 2],
    [gap * 0.7, -h - gap * 0.5],
    [-gap * 0.7 - w, gap * 0.5],
    [gap * 0.7, gap * 0.5],
    [-gap * 0.7 - w, -h - gap * 0.5],
  ];
  for (const [ox, oy] of places) {
    const box: Box = { l: x + ox, t: y + oy, r: x + ox + w, b: y + oy + h };
    if (box.l < bounds.l || box.r > bounds.r || box.t < bounds.t || box.b > bounds.b) continue;
    if (!taken.some((t) => overlaps(t, box))) return box;
  }
  return null;
}

/**
 * Along whichever border a box lies against, the place nearest its own that touches no
 * name (`clear`) and covers the fewest of the brighter stars (`cost`).
 */
function slide(box: Box, bounds: Box, clear: (b: Box) => boolean, cost: (b: Box) => number): Box | null {
  const w = box.r - box.l;
  const h = box.b - box.t;
  const alongX = Math.abs(box.t - bounds.t) < 2 || Math.abs(box.b - bounds.b) < 2;
  let best: Box | null = null;
  let bestCost = Infinity;
  for (const step of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
    const d = step * SLIDE_STEP;
    const l = alongX ? Math.min(Math.max(box.l + d, bounds.l), bounds.r - w) : box.l;
    const t = alongX ? box.t : Math.min(Math.max(box.t + d, bounds.t), bounds.b - h);
    const b: Box = { l, t, r: l + w, b: t + h };
    if (!clear(b)) continue;
    const c = cost(b);
    if (c < bestCost) {
      best = b;
      bestCost = c;
      if (c === 0) break;
    }
  }
  return best;
}

export interface Overlay {
  layout(frame: Frame): void;
  /** `seen` holds, per star, its x, y and how far it has come up (from the plate's projection). */
  update(view: View, state: OverlayState, seen: Float32Array): void;
  setReader(pieces: readonly string[]): { charted: string[]; uncharted: string[] };
  /** Pieces on the chart, for the plate's own bookkeeping. */
  readerStars(): number[];
  hover(star: number | null, x: number, y: number): void;
  onName(handler: (id: string) => void): void;
  destroy(): void;
}

export function createOverlay(root: HTMLElement, seed: number): Overlay {
  const marks = svgEl('svg', { class: 'chart__marks', 'aria-hidden': 'true', focusable: 'false' });
  const border = svgEl('g', { class: 'chart-border' }, marks);
  const uncharted = svgEl('g', { class: 'chart-uncharted' }, marks);
  const ringLayer = svgEl('g', { class: 'chart-rings' }, marks);
  const names = document.createElement('div');
  names.className = 'chart__names';
  const words = document.createElement('div');
  words.className = 'chart__words';
  words.setAttribute('aria-hidden', 'true');
  const hoverLabel = document.createElement('span');
  hoverLabel.className = 'chart-hover';
  hoverLabel.setAttribute('aria-hidden', 'true');
  root.append(marks, words, names, hoverLabel);

  let frame: Frame = { width: 0, height: 0, band: 0 };
  // From the field's edge to the ruled border (the drawing is clipped to the same line).
  let INSET = 10;
  let fontSize = 18;
  let rings: Ring[] = [];
  let readerUncharted: string[] = [];
  let labels: Label[] = [];
  let labelKey = '';
  const widths = new Map<number, { w: number; h: number }>();
  let handler: ((id: string) => void) | null = null;

  const list: Name[] = CONSTELLATIONS.map((c) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chart-name';
    button.dataset.constellation = c.id;
    button.setAttribute('aria-label', c.name);
    const art = svgEl('svg', { class: 'chart-name__art', 'aria-hidden': 'true', focusable: 'false' });
    button.append(art);
    button.addEventListener('click', () => handler?.(c.id));
    names.append(button);
    const { centroid, radius } = extent(c.id);
    return { id: c.id, button, art, w: 0, h: 0, top: 0, tilt: signed(seed, `tilt-${c.id}`) * 3, centroid, radius, placed: '' };
  });

  /** Letter each name along an arc sized to its own length, measured once the fonts are in. */
  function letter(): void {
    fontSize = parseFloat(getComputedStyle(names).fontSize) || 18;
    for (const n of list) {
      const name = CONSTELLATIONS.find((c) => c.id === n.id)!.name;
      n.art.replaceChildren();
      const probe = svgEl('text', { class: 'chart-name__text' }, n.art);
      probe.textContent = name;
      const length = probe.getComputedTextLength() || name.length * fontSize * 0.46;
      probe.remove();
      const radius = Math.min(420, Math.max(150, length * (1.4 + rand(seed, `arc-${n.id}`) * 0.7)));
      const sweep = (length + 16) / radius;
      const sag = radius * (1 - Math.cos(sweep / 2));
      const x0 = -radius * Math.sin(sweep / 2);
      const id = `chart-arc-${n.id}`;
      svgEl('path', { id, d: `M${x0.toFixed(2)},${sag.toFixed(2)} A${radius.toFixed(1)},${radius.toFixed(1)} 0 0 1 ${(-x0).toFixed(2)},${sag.toFixed(2)}`, fill: 'none' }, n.art);
      const text = svgEl('text', { class: 'chart-name__text' }, n.art);
      const path = svgEl('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' }, text);
      path.textContent = name;
      n.w = Math.ceil(length + 24);
      n.top = Math.ceil(fontSize * 1.05);
      n.h = Math.ceil(n.top + sag + fontSize * 0.4);
      n.art.setAttribute('viewBox', `${-n.w / 2} ${-n.top} ${n.w} ${n.h}`);
      n.art.setAttribute('width', String(n.w));
      n.art.setAttribute('height', String(n.h));
      n.button.style.width = `${n.w}px`;
      n.button.style.height = `${n.h}px`;
      n.button.style.transformOrigin = `${n.w / 2}px ${n.top}px`;
      n.placed = '';
    }
  }

  function drawBorder(): void {
    border.replaceChildren();
    const r = rngFor(seed, 'border');
    const w = frame.width;
    const h = frame.height - frame.band;
    const outer = INSET;
    const inner = INSET + 3;
    svgEl('rect', { x: outer, y: outer, width: w - outer * 2, height: h - outer * 2, class: 'chart-border__rule' }, border);
    svgEl('rect', { x: inner, y: inner, width: w - inner * 2, height: h - inner * 2, class: 'chart-border__rule chart-border__rule--inner' }, border);
    // Degree ticks along the inner rule, a longer one every fifth, drawn a little unevenly.
    let d = '';
    const tick = (x1: number, y1: number, x2: number, y2: number) => {
      d += `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} `;
    };
    for (let x = inner + TICK_STEP, k = 1; x < w - inner - 4; x += TICK_STEP, k++) {
      const len = (k % 5 === 0 ? 7 : 3.5) + r() * 0.6;
      tick(x, inner, x, inner + len);
      tick(x, h - inner, x, h - inner - len);
    }
    for (let y = inner + TICK_STEP, k = 1; y < h - inner - 4; y += TICK_STEP, k++) {
      const len = (k % 5 === 0 ? 7 : 3.5) + r() * 0.6;
      tick(inner, y, inner + len, y);
      tick(w - inner, y, w - inner - len, y);
    }
    svgEl('path', { d, class: 'chart-border__ticks' }, border);
  }

  /** The Uncharted: a dashed arc at the lower rim, lettered, with the reader's unknown pieces on it. */
  function drawUncharted(): void {
    uncharted.replaceChildren();
    const h = frame.height - frame.band;
    const narrow = frame.width < NARROW;
    // On a wide field The Uncharted shares the foot with the toggle; on a phone it lies above it.
    const x0 = INSET + 8;
    const x1 = narrow ? frame.width - INSET - 8 : Math.min(frame.width * 0.56, frame.width - 250);
    const y = narrow ? h + 30 : h + frame.band * 0.62;
    const bow = 7;
    const d = `M${x0},${y - bow} Q${(x0 + x1) / 2},${y + bow} ${x1},${y - bow}`;
    svgEl('path', { id: 'chart-uncharted-arc', d, class: 'chart-uncharted__rim' }, uncharted);
    const name = svgEl('text', { class: 'chart-uncharted__name', dy: '1.1em' }, uncharted);
    const path = svgEl('textPath', { href: '#chart-uncharted-arc', startOffset: '4%' }, name);
    path.textContent = 'The Uncharted';

    // The reader's pieces the chart doesn't know, set along the rim above it.
    let x = x0 + 4;
    let shown = 0;
    for (const piece of readerUncharted) {
      const g = svgEl('g', { class: 'chart-uncharted__piece' }, uncharted);
      const label = svgEl('text', { x: x + 9, y: y - bow - 6 }, g);
      label.textContent = piece;
      const width = label.getComputedTextLength() + 9;
      if (x + width > x1 - 70 && shown > 0) {
        g.remove();
        const more = svgEl('text', { x, y: y - bow - 6, class: 'chart-uncharted__more' }, uncharted);
        more.textContent = `and ${readerUncharted.length - shown} more`;
        break;
      }
      svgEl('circle', { cx: x + 3, cy: y - bow - 10, r: 2.6 }, g);
      x += width + 12;
      shown += 1;
    }
  }

  function ringPath(star: number): string {
    const r = rngFor(seed, `ring-${star}`);
    const ringRadius = RING_RADIUS * symbolScale(frame.width || 720);
    const start = r() * Math.PI * 2;
    const pts: string[] = [];
    // A pen ring: a little more than once round, never quite a circle.
    for (let i = 0; i <= 40; i++) {
      const a = start + (i / 40) * Math.PI * 2 * 1.08;
      const radius = ringRadius + Math.sin(a * 2 + r() * 0.3) * 0.5 + (i / 40) * 1.2;
      pts.push(`${(Math.cos(a) * radius).toFixed(2)},${(Math.sin(a) * radius).toFixed(2)}`);
    }
    return `M${pts.join(' L')}`;
  }

  return {
    layout(next: Frame) {
      frame = next;
      INSET = parseFloat(getComputedStyle(root).getPropertyValue('--chart-inset')) || INSET;
      marks.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
      marks.setAttribute('width', String(frame.width));
      marks.setAttribute('height', String(frame.height));
      letter();
      drawBorder();
      drawUncharted();
    },

    update(view: View, state: OverlayState, seen: Float32Array) {
      const project = projector(view);
      const symbol = symbolScale(frame.width);
      const narrow = frame.width < NARROW;
      const inner: Box = { l: INSET + 6, t: INSET + 6, r: frame.width - INSET - 6, b: frame.height - frame.band - INSET - 6 };
      const cx = (inner.l + inner.r) / 2;
      const cy = (inner.t + inner.b) / 2;
      border.style.opacity = String(state.border);
      uncharted.style.opacity = String(state.border);

      // Stars keep their symbols clear of every word set from here on.
      const symbols: Box[] = [];
      // As on an old chart, a name may be printed over the faintest stars, never the brighter ones.
      const bright: Box[] = [];
      STARS.forEach((star, i) => {
        const x = seen[i * 3];
        const y = seen[i * 3 + 1];
        if (seen[i * 3 + 2] < 0.5 || x < inner.l || x > inner.r || y < inner.t || y > inner.b) return;
        const room = STAR_ROOM[star.mag] * symbol;
        const box = { l: x - room, t: y - room, r: x + room, b: y + room };
        symbols.push(box);
        if (star.mag <= FAINT) bright.push(box);
      });
      // And the reader's rings keep theirs.
      const ringRoom = RING_RADIUS * symbol + 2;
      for (const ring of rings) {
        const i = ring.star;
        if (seen[i * 3 + 2] < 0.5 || state.rings <= 0) continue;
        const x = seen[i * 3];
        const y = seen[i * 3 + 1];
        const box = { l: x - ringRoom, t: y - ringRoom, r: x + ringRoom, b: y + ringRoom };
        symbols.push(box);
        bright.push(box);
      }

      // Where each name would go: above its constellation, or at the border, pointing the way.
      const candidates = list.map((n, index) => {
        const c = project(n.centroid);
        if (c.depth <= 1) return { n, index, x: 0, y: 0, ok: false, edge: false, reach: Infinity, others: [] as { x: number; y: number }[] };
        const rp = n.radius * pxPerUnit(view, c.depth);
        const onField = c.x > inner.l && c.x < inner.r && c.y > inner.t && c.y < inner.b;
        let x = c.x;
        let y = c.y - rp * 0.78 - LABEL_GAP;
        let ok = onField;
        let edge = false;
        const others: { x: number; y: number }[] = [];
        const within = (px: number, py: number) => ({
          x: Math.min(Math.max(px, inner.l + n.w / 2), inner.r - n.w / 2),
          y: Math.min(Math.max(py, inner.t + n.top), inner.b - (n.h - n.top)),
        });
        if (onField) {
          ({ x, y } = within(x, y));
          // If that place is taken: a little to either side, then below the constellation.
          const below = c.y + rp * 0.78 + LABEL_GAP + n.top;
          others.push(within(x - n.w * 0.35, y), within(x + n.w * 0.35, y), within(c.x, below));
        } else if (state.edges) {
          const dx = c.x - cx;
          const dy = c.y - cy;
          const ex = (inner.r - inner.l) / 2 - n.w / 2;
          const ey = (inner.b - inner.t) / 2 - n.h / 2;
          const k = Math.min(ex / (Math.abs(dx) || 1e-6), ey / (Math.abs(dy) || 1e-6));
          x = cx + dx * k;
          y = cy + dy * k + n.top - n.h / 2;
          ok = true;
          edge = true;
        }
        return { n, index, x, y, ok, edge, reach: Math.hypot(c.x - cx, c.y - cy), others };
      });

      // Set the most wanted names first; any that would touch one already set wait.
      const rank = (id: string) => (id === state.focus ? 0 : STOPS.includes(id) ? 1 : 2);
      candidates.sort((a, b) => Number(a.edge) - Number(b.edge) || rank(a.n.id) - rank(b.n.id) || a.reach - b.reach);
      const taken: Box[] = [];
      let edges = 0;
      for (const cand of candidates) {
        const { n } = cand;
        const lettered = state.lettered[cand.index];
        let show = cand.ok && lettered > 0.02;
        // A phone letters only the stops' names over the whole chart, and points fewer ways.
        if (narrow && !state.focus && !cand.edge && !STOPS.includes(n.id)) show = false;
        if (cand.edge && edges >= (narrow ? EDGES.narrow : EDGES.wide)) show = false;
        let box: Box = { l: cand.x - n.w / 2, t: cand.y - n.top, r: cand.x + n.w / 2, b: cand.y - n.top + n.h };
        if (show && cand.edge) {
          // A name pointing the way from the border slides along it to where it covers fewest stars.
          const free = slide(
            box,
            inner,
            (b) => !taken.some((t) => overlaps(t, b)),
            (b) => bright.filter((m) => overlaps(m, b)).length,
          );
          if (free) {
            cand.x += free.l - box.l;
            cand.y += free.t - box.t;
            box = free;
          } else {
            show = false;
          }
        }
        // A name over its own constellation may touch its stars, but never another name.
        if (show && !cand.edge) {
          const boxAt = (p: { x: number; y: number }): Box => ({ l: p.x - n.w / 2, t: p.y - n.top, r: p.x + n.w / 2, b: p.y - n.top + n.h });
          const place = [{ x: cand.x, y: cand.y }, ...cand.others].find((p) => !taken.some((t) => overlaps(t, boxAt(p))));
          if (place) {
            cand.x = place.x;
            cand.y = place.y;
            box = boxAt(place);
          } else {
            show = false;
          }
        }
        if (show) taken.push(box);
        if (show && cand.edge) edges += 1;
        // A name with no room is not lettered, but it keeps a place on the chart and its turn
        // in the Tab order: focused from the keyboard, it is shown there (Phase 8).
        const at = show ? cand : { x: clamp(cand.x, inner.l + n.w / 2, inner.r - n.w / 2), y: clamp(cand.y, inner.t + n.top, inner.b - (n.h - n.top)) };
        const key = `${at.x.toFixed(1)},${at.y.toFixed(1)},${cand.edge},${show}`;
        if (key !== n.placed) {
          n.placed = key;
          n.button.classList.toggle('is-placed', show);
          const scale = show && cand.edge ? ` scale(${EDGE_SCALE})` : '';
          n.button.style.transform = `translate(${(at.x - n.w / 2).toFixed(1)}px, ${(at.y - n.top).toFixed(1)}px) rotate(${n.tilt.toFixed(2)}deg)${scale}`;
        }
        n.button.style.setProperty('--lettered', lettered.toFixed(3));
        n.button.classList.toggle('is-edge', cand.edge);
      }

      const blocked = [...taken, ...symbols];

      // The words a stop's caption names, each set beside its star.
      const key = state.labels.join();
      if (key !== labelKey) {
        labelKey = key;
        labels.forEach((l) => l.el.remove());
        labels = state.labels.map((star) => {
          const el = document.createElement('span');
          el.className = 'chart-word';
          el.textContent = STARS[star].text.replace(/'/g, '’');
          words.append(el);
          let size = widths.get(star);
          if (!size) {
            // Measured once per word, when a stop first names it.
            size = { w: el.offsetWidth, h: el.offsetHeight };
            widths.set(star, size);
          }
          return { el, star, ...size };
        });
      }
      for (const label of labels) {
        const x = seen[label.star * 3];
        const y = seen[label.star * 3 + 1];
        const box = state.labelled > 0.01 && seen[label.star * 3 + 2] > 0.5 ? beside(x, y, label.w, label.h, WORD_GAP, inner, blocked) : null;
        if (!box) {
          label.el.style.opacity = '0';
          continue;
        }
        blocked.push(box);
        label.el.style.opacity = state.labelled.toFixed(3);
        label.el.style.transform = `translate(${box.l.toFixed(1)}px, ${box.t.toFixed(1)}px)`;
      }

      // The reader's rings, and "yours" wherever it has room.
      const n = rings.length;
      rings.forEach((ring, i) => {
        const p = project(STARS[ring.star].p);
        const on = p.depth > 1 && p.x > inner.l && p.x < inner.r && p.y > inner.t && p.y < inner.b;
        const step = n > 1 ? 0.4 / (n - 1) : 0;
        const t = Math.min(1, Math.max(0, (state.rings - i * step) / 0.6));
        if (!on || t <= 0) {
          ring.g.style.display = 'none';
          return;
        }
        ring.g.style.display = '';
        ring.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        ring.path.style.strokeDasharray = `${t.toFixed(3)} 2`;
        const box = beside(p.x, p.y, YOURS.w, YOURS.h, YOURS.gap, inner, blocked);
        if (box) {
          blocked.push(box);
          ring.label.setAttribute('x', (box.l - p.x).toFixed(1));
          ring.label.setAttribute('y', (box.b - p.y - 4).toFixed(1));
        }
        ring.label.style.opacity = box ? Math.min(1, t * 1.6).toFixed(3) : '0';
      });
    },

    setReader(pieces: readonly string[]) {
      const charted: string[] = [];
      const unknown: string[] = [];
      const unknownMarks: string[] = [];
      const once = new Set<string>();
      for (const piece of pieces) {
        if (once.has(piece)) continue;
        once.add(piece);
        if (starFor(piece) >= 0) {
          charted.push(spokenPiece(piece));
        } else {
          unknown.push(spokenPiece(piece));
          unknownMarks.push(piece.replace(/^ /, '').replace(/'/g, '’'));
        }
      }
      const stars = [...new Set(pieces.map(starFor).filter((i) => i >= 0))];
      ringLayer.replaceChildren();
      rings = stars.map((star) => {
        const g = svgEl('g', { class: 'chart-ring' }, ringLayer);
        const path = svgEl('path', { d: ringPath(star), pathLength: 1 }, g);
        const label = svgEl('text', { x: YOURS.gap, y: -4 }, g);
        label.textContent = 'yours';
        return { star, g, path, label };
      });
      readerUncharted = unknownMarks;
      if (frame.width) drawUncharted();
      return { charted, uncharted: unknown };
    },

    readerStars() {
      return rings.map((r) => r.star);
    },

    hover(star: number | null, x: number, y: number) {
      if (star === null) {
        hoverLabel.classList.remove('is-shown');
        return;
      }
      hoverLabel.textContent = STARS[star].text.replace(/'/g, '’');
      hoverLabel.style.transform = `translate(${(x + HOVER_OFFSET).toFixed(1)}px, ${(y - HOVER_OFFSET).toFixed(1)}px) translateY(-100%)`;
      hoverLabel.classList.add('is-shown');
    },

    onName(h: (id: string) => void) {
      handler = h;
    },

    destroy() {
      marks.remove();
      words.remove();
      names.remove();
      hoverLabel.remove();
    },
  };
}
