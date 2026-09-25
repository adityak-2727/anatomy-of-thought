// Hand-made marks. Every edge, pin, thread and rim on the site is generated here
// from a seed, so it is irregular in the way a drawn thing is, yet identical on every visit.

import { createNoise2D } from 'simplex-noise';
import { rngFor } from '../motion/random';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

const px = (n: number) => `${n.toFixed(2)}px`;
const at = (xPct: number, xPx: number, yPct: number, yPx: number) =>
  `calc(${xPct}% + ${px(xPx)}) calc(${yPct}% + ${px(yPx)})`;

/** A ragged outline for a field drawn in plain CSS (the no-WebGL fallback). */
export function raggedClip(seed: number, steps = 14, depth = 6): string {
  const r = rngFor(seed, 'ragged');
  const j = () => (r() - 0.5) * 2 * depth;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) pts.push(at((i / steps) * 100, j(), 0, j()));
  for (let i = 1; i <= steps; i++) pts.push(at(100, j(), (i / steps) * 100, j()));
  for (let i = steps - 1; i >= 0; i--) pts.push(at((i / steps) * 100, j(), 100, j()));
  for (let i = steps - 1; i > 0; i--) pts.push(at(0, j(), (i / steps) * 100, j()));
  return `polygon(${pts.join(', ')})`;
}

/** A slip cut with scissors: four straight edges, none quite square. */
export function slipClip(seed: number, depth = 1.6): string {
  const r = rngFor(seed, 'slip');
  const j = () => r() * depth;
  return `polygon(${at(0, j(), 0, j())}, ${at(100, -j(), 0, j())}, ${at(100, -j(), 100, -j())}, ${at(0, j(), 100, -j())})`;
}

/** Ticker tape torn at both ends. */
export function tornClip(seed: number, teeth = 5, depth = 3.5): string {
  const r = rngFor(seed, 'torn');
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) pts.push(at(100, -r() * depth, (i / teeth) * 100, 0));
  for (let i = teeth; i >= 0; i--) pts.push(at(0, r() * depth, (i / teeth) * 100, 0));
  return `polygon(${pts.join(', ')})`;
}

/** A slip of sensitised paper: corners snipped, the long edges very slightly deckled. */
export function deckleClip(seed: number): string {
  const r = rngFor(seed, 'deckle');
  const c = () => 2 + r() * 3;
  const w = () => (r() - 0.5) * 1.4;
  const pts = [
    at(0, c(), 0, 0), at(33, 0, 0, w()), at(66, 0, 0, w()), at(100, -c(), 0, 0),
    at(100, 0, 0, c()), at(100, 0, 100, -c()),
    at(100, -c(), 100, 0), at(66, 0, 100, w()), at(33, 0, 100, w()), at(0, c(), 100, 0),
    at(0, 0, 100, -c()), at(0, 0, 0, c()),
  ];
  return `polygon(${pts.join(', ')})`;
}

/**
 * A dressmaker's pin, in elevation: a round head and a fine shaft laid at an angle.
 * Where it lies on the slip it is drawn in ink; where it lies on the blue it is a white shadow.
 * The svg is positioned by the caller; the head sits at (0, 0).
 */
export function pinMark(
  seed: number,
  slipBox: { x: number; y: number; w: number; h: number },
  direction = -150, // degrees; the shaft points up and out, away from the slip
): SVGSVGElement {
  const r = rngFor(seed, 'pin');
  const angle = direction - 12 + r() * 24;
  const len = 20 + r() * 6;
  const rad = (angle * Math.PI) / 180;
  const x2 = Math.cos(rad) * len;
  const y2 = Math.sin(rad) * len;
  const id = `pin-${seed}`;
  const svg = svgEl('svg', { class: 'pin', viewBox: '-30 -30 60 60', width: 60, height: 60, 'aria-hidden': 'true', focusable: 'false' });
  const defs = svgEl('defs', {}, svg);
  const clip = svgEl('clipPath', { id }, defs);
  svgEl('rect', { x: slipBox.x, y: slipBox.y, width: slipBox.w, height: slipBox.h }, clip);
  const shaft = `M0,0 L${x2.toFixed(2)},${y2.toFixed(2)}`;
  // The shadow on the field.
  svgEl('path', { d: shaft, class: 'pin__shaft pin__shaft--field' }, svg);
  svgEl('circle', { cx: 0, cy: 0, r: 3.6, class: 'pin__head pin__head--field' }, svg);
  // The pin itself where it lies over the slip.
  const onSlip = svgEl('g', { 'clip-path': `url(#${id})` }, svg);
  svgEl('path', { d: shaft, class: 'pin__shaft' }, onSlip);
  svgEl('circle', { cx: 0, cy: 0, r: 3.6, class: 'pin__head' }, onSlip);
  svgEl('circle', { cx: -1.1, cy: -1.1, r: 1, class: 'pin__glint' }, onSlip);
  return svg;
}

/**
 * A thread laid from one point to another in an arc above them, like cotton lifted
 * over the row. Returns one path per ply; each wanders a little along its length.
 */
type Point = { x: number; y: number };

/** The arc a thread follows: a cubic lifted above both ends, higher for longer spans. */
export function threadCurve(from: Point, to: Point): (t: number) => Point {
  const dx = to.x - from.x;
  const span = Math.abs(dx);
  const lift = Math.min(span * 0.42, 40 + Math.pow(span, 0.85) * 0.35);
  const top = Math.min(from.y, to.y) - lift;
  const c1 = { x: from.x + dx * 0.12, y: top };
  const c2 = { x: to.x - dx * 0.12, y: top };
  return (t: number) => {
    const mt = 1 - t;
    return {
      x: mt ** 3 * from.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * to.x,
      y: mt ** 3 * from.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * to.y,
    };
  };
}

function polyline(pts: Point[]): string {
  return `M${pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L')}`;
}

export function threadPaths(from: Point, to: Point, seed: number, plies = 1): string[] {
  const noise = createNoise2D(rngFor(seed, 'thread'));
  const curve = threadCurve(from, to);
  const steps = Math.max(24, Math.round(Math.abs(to.x - from.x) / 6));
  const paths: string[] = [];
  for (let ply = 0; ply < plies; ply++) {
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve(t);
      // Cotton wanders a little along its length; plies part by about 1.2px mid-span.
      const envelope = Math.sin(Math.PI * t);
      const slow = noise(t * 3.1, ply * 5.3) * 0.8;
      const quick = noise(t * 23, ply * 7.7 + 11) * 0.3;
      const offset = (ply - (plies - 1) / 2) * 1.2 * envelope;
      pts.push({ x: p.x + slow * 0.4, y: p.y + (slow + quick) * envelope + offset });
    }
    paths.push(polyline(pts));
  }
  return paths;
}

/** Stray fibres: short, very fine strands that leave the thread and rejoin it. */
export function threadFibres(from: Point, to: Point, seed: number, count = 2): string[] {
  const r = rngFor(seed, 'fibres');
  const noise = createNoise2D(r);
  const curve = threadCurve(from, to);
  const out: string[] = [];
  for (let f = 0; f < count; f++) {
    const start = 0.08 + r() * 0.5;
    const end = Math.min(0.95, start + 0.18 + r() * 0.3);
    const side = r() < 0.5 ? -1 : 1;
    const pts: Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = start + ((end - start) * i) / 16;
      const p = curve(t);
      const away = Math.sin((Math.PI * i) / 16) * (0.8 + r() * 0.4) * side + noise(t * 17, f) * 0.35;
      pts.push({ x: p.x, y: p.y + away });
    }
    out.push(polyline(pts));
  }
  return out;
}

/** A leader line: a short hairline from a label to the thing it names, drawn by hand. */
export function leaderPath(x1: number, y1: number, x2: number, y2: number, seed: number): string {
  const r = rngFor(seed, 'leader');
  const mx = (x1 + x2) / 2 + (r() - 0.5) * 1.2;
  const my = (y1 + y2) / 2 + (r() - 0.5) * 1.2;
  return `M${x1.toFixed(2)},${y1.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

/** The mark for a leading space: an open box on the baseline, as ␣ is written. */
export function spaceMark(): SVGSVGElement {
  const svg = svgEl('svg', { class: 'space-mark', viewBox: '0 0 10 8', width: '0.52em', height: '0.42em', 'aria-hidden': 'true', focusable: 'false' });
  svgEl('path', { d: 'M0.8,1.2 L0.9,6.9 L9.1,6.8 L9.2,1.1' }, svg);
  return svg;
}

/** The loupe's rim: a paper line, with a crescent of engraved hatching as its shadow. */
export function lensRim(size: number, rim: number): SVGSVGElement {
  const r = size / 2;
  const svg = svgEl('svg', { class: 'lens__rim', viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true', focusable: 'false' });
  const defs = svgEl('defs', {}, svg);
  // Inside the rim, minus a circle nudged down and right: a crescent at the upper left.
  const mask = svgEl('mask', { id: 'lens-crescent', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: size, height: size }, defs);
  svgEl('circle', { cx: r, cy: r, r: r - rim, fill: 'white' }, mask);
  svgEl('circle', { cx: r + 7, cy: r + 10, r: r - rim - 3, fill: 'black' }, mask);
  const hatch = svgEl('g', { class: 'lens__hatch', mask: 'url(#lens-crescent)' }, svg);
  for (let i = -size; i < size; i += 3.2) {
    svgEl('line', { x1: i, y1: 0, x2: i + size, y2: size }, hatch);
  }
  svgEl('circle', { cx: r, cy: r, r: r - rim / 2, class: 'lens__line' }, svg);
  return svg;
}
