// Cutting a slip into pieces. The specimen on Plate II (scrubbed by scroll) and the
// reader's own sentence (played in time) are cut by the same hand.
//
// Both layouts are known before anything moves: the strips as laid (A) and the loose
// rows after cutting (B). Each piece sits at its place in B and is carried there from A
// by transforms, the FLIP technique worked out directly: Flip's measuring of live DOM
// states does not sit well with a scrubbed timeline that is rebuilt on every resize.

import { gsap } from 'gsap';
import { pieceId } from '../lib/hash';
import { leaderPath, pinMark, slipClip, spaceMark, svgEl } from '../components/marks';
import { createTicker } from '../components/ticker';
import { PIN_DROP, PLATE2 } from '../motion/eases';
import { signed } from '../motion/random';
import { pressInto } from '../motion/verbs';

type Point = { x: number; y: number };

export interface CutPiece {
  el: HTMLElement;
  slip: HTMLElement;
  text: string;
  id: number;
  seed: number;
  letter: HTMLElement | null;
  leader: SVGSVGElement | null;
  ticker: HTMLElement;
  pin: SVGSVGElement;
  w: number;
  h: number;
  a: Point;
  b: Point;
  /** How far it shifts from its neighbour as the slip is cut, and the jolt. */
  part: number;
  jolt: number;
  /** Its turn once laid. */
  turn: number;
}

export interface Laid {
  pieces: CutPiece[];
  cuts: SVGLineElement[];
  offcuts: HTMLElement[];
  strips: { top: number; left: number; right: number }[];
  height: number;
}

interface Metrics {
  label: number;
  tickerRoom: number;
  colGap: number;
  rowGap: number;
  stripGap: number;
}

const PIN_INSET = 3;
const OFFCUT = 12;
/** How far a hand-laid layout strays from a grid, in px. */
const HAND = { rowIndent: 22, rise: 6, gap: 5, stripIndent: 18 };

function metrics(): Metrics {
  const css = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(css.getPropertyValue(name)) || 0;
  return {
    label: px('--cut-label-room'),
    tickerRoom: px('--cut-ticker-room'),
    colGap: px('--cut-col-gap'),
    rowGap: px('--cut-row-gap'),
    stripGap: px('--cut-strip-gap'),
  };
}

/** A list item for one piece, its text given as plain text (the reader's words never become HTML). */
export function pieceItem(text: string): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'cut-piece';
  li.dataset.piece = text;
  const slip = document.createElement('span');
  slip.className = 'slip';
  slip.textContent = text.replace(/^ /, '').replace(/'/g, '’');
  li.append(slip);
  return li;
}

/**
 * Fit out each piece once: its ticker, its pin, and (on the specimen) its letter.
 * With `speakIds`, each piece's number is also written as hidden text, for screen
 * readers (the specimen has its table instead).
 */
export function prepare(list: HTMLElement, seed: number, letters?: readonly string[], speakIds = false): CutPiece[] {
  return [...list.querySelectorAll<HTMLElement>('.cut-piece')].map((el, i) => {
    const text = el.dataset.piece ?? el.textContent ?? '';
    const s = seed + i * 7;
    const slip = el.querySelector<HTMLElement>('.slip')!;
    const id = pieceId(text);
    if (speakIds) {
      const spoken = document.createElement('span');
      spoken.className = 'visually-hidden';
      spoken.textContent = `, number ${id}`;
      el.append(spoken);
    }
    const ticker = createTicker(String(id), s);
    ticker.setAttribute('aria-hidden', 'true');
    const pin = pinMark(s, { x: -PIN_INSET, y: -PIN_INSET, w: 1, h: 1 });
    pin.style.left = `${PIN_INSET}px`;
    pin.style.top = `${PIN_INSET}px`;
    let letter: HTMLElement | null = null;
    let leader: SVGSVGElement | null = null;
    if (letters?.[i]) {
      letter = document.createElement('span');
      letter.className = 'letter';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = letters[i];
      leader = svgEl('svg', { class: 'leader', viewBox: '0 0 8 14', 'aria-hidden': 'true', focusable: 'false' });
      svgEl('path', { d: leaderPath(4, 0.5, 4, 13.5, s) }, leader);
      el.append(leader, letter);
    }
    el.append(ticker, pin);
    return { el, slip, text, id, seed: s, letter, leader, ticker, pin, w: 0, h: 0, a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, part: 0, jolt: 0, turn: 0 };
  });
}

/**
 * Measure once, then work out both layouts and place every piece at its final spot.
 * `breaks` start a new strip at those pieces (the specimen lies on two strips);
 * otherwise a strip runs on until the stage is full.
 */
export function lay(stage: HTMLElement, list: HTMLElement, pieces: CutPiece[], seed: number, breaks: number[] = []): Laid {
  list.classList.add('is-laid');
  const m = metrics();
  const width = stage.clientWidth;
  // Read everything first, then write: one layout pass, not one per piece.
  const sizes = pieces.map((p) => ({ w: p.slip.offsetWidth, h: p.slip.offsetHeight, tw: (p.ticker.firstElementChild as HTMLElement).offsetWidth }));

  const slipH = Math.max(...sizes.map((s) => s.h));
  pieces.forEach((p, i) => {
    p.w = sizes[i].w;
    p.h = sizes[i].h;
  });

  // B: loose rows, laid by hand. Each piece has a slot wide enough for its ticker; the
  // gaps, the rows' starts and each piece's height vary a little, and the whole block
  // is centred on the field.
  const rowH = m.label + slipH + m.tickerRoom + m.rowGap;
  const rows: { indent: number; right: number }[] = [];
  let bx = 0;
  let row = -1;
  pieces.forEach((p, i) => {
    const slot = Math.max(sizes[i].w, sizes[i].tw);
    if (row < 0 || bx + slot > width) {
      row += 1;
      bx = Math.abs(signed(seed, `row-${row}`)) * HAND.rowIndent;
      rows.push({ indent: bx, right: bx });
    }
    p.b = {
      x: bx + (slot - sizes[i].w) / 2,
      y: row * rowH + m.label + signed(seed, `by-${i}`) * HAND.rise,
    };
    bx += slot + m.colGap + signed(seed, `gap-${i}`) * HAND.gap;
    rows[row].right = bx - m.colGap;
  });
  const blockW = Math.max(...rows.map((r) => r.right));
  const shiftB = Math.max(0, (width - blockW) / 2);
  for (const p of pieces) p.b.x += shiftB;
  const bHeight = rows.length * rowH;

  // A: the strips, as laid on the field before the cut, centred on it. A strip only
  // ever breaks between words: suit and case, or it and ’s, stay on one strip.
  const strips: Laid['strips'] = [];
  const stripOf: number[] = [];
  const words: number[][] = [];
  pieces.forEach((p, i) => {
    if (i === 0 || p.text.startsWith(' ') || breaks.includes(i)) words.push([i]);
    else words[words.length - 1].push(i);
  });
  let x = 0;
  for (const word of words) {
    const wordW = word.reduce((sum, i) => sum + sizes[i].w, 0);
    if (strips.length === 0 || breaks.includes(word[0]) || (x > 0 && x + wordW > width - OFFCUT * 2)) {
      x = strips.length > 0 ? Math.abs(signed(seed, `strip-${strips.length}`)) * HAND.stripIndent : 0;
      strips.push({ top: 0, left: x, right: x });
    }
    for (const i of word) {
      stripOf[i] = strips.length - 1;
      pieces[i].a = { x, y: 0 };
      x += sizes[i].w;
    }
    strips[strips.length - 1].right = x;
  }
  const stripsW = Math.max(...strips.map((s) => s.right));
  const stripsH = strips.length * slipH + (strips.length - 1) * m.stripGap;
  const shiftAx = Math.max(OFFCUT, (width - stripsW) / 2);
  const shiftAy = Math.max(m.label, (bHeight - stripsH) / 2 - m.label / 2);
  strips.forEach((s, k) => {
    s.top = shiftAy + k * (slipH + m.stripGap);
    s.left += shiftAx;
    s.right += shiftAx;
  });
  pieces.forEach((p, i) => {
    p.a = { x: p.a.x + shiftAx, y: strips[stripOf[i]].top };
  });
  const y = strips[strips.length - 1].top;

  // How each piece shifts as it is cut, and how it turns once laid.
  let k = 0;
  pieces.forEach((p, i) => {
    if (i > 0 && p.a.y !== pieces[i - 1].a.y) k = 0;
    p.part = k * PLATE2.partGap + signed(seed, `part-${i}`) * PLATE2.partJitter;
    p.jolt = signed(seed, `jolt-${i}`) * PLATE2.partTurn;
    p.turn = signed(seed, `turn-${i}`) * PLATE2.maxTurn;
    k += 1;
  });

  for (const p of pieces) {
    p.el.style.left = `${p.b.x}px`;
    p.el.style.top = `${p.b.y}px`;
    const rect = p.pin.querySelector('clipPath rect');
    rect?.setAttribute('width', String(p.w));
    rect?.setAttribute('height', String(p.h));
  }
  const aBottom = y + slipH + m.tickerRoom;
  const height = Math.max(bHeight, aBottom);
  stage.style.height = `${height}px`;

  // The cut lines: at each strip's ends (the offcuts) and between every two pieces.
  const svg = stage.querySelector<SVGSVGElement>('.cuts') ?? svgEl('svg', { class: 'cuts', 'aria-hidden': 'true', focusable: 'false' }, stage);
  svg.replaceChildren();
  stage.querySelectorAll('.offcut').forEach((o) => o.remove());
  const cuts: SVGLineElement[] = [];
  const offcuts: HTMLElement[] = [];
  const cutAt = (cx: number, top: number, n: number) => {
    const lean = signed(seed, `lean-${n}`) * 1.2;
    cuts.push(svgEl('line', { x1: cx, y1: top - 3, x2: cx + lean, y2: top - 3, 'data-y2': top + slipH + 3 }, svg));
  };
  strips.forEach((s, n) => {
    for (const side of [s.left - OFFCUT, s.right]) {
      const off = document.createElement('span');
      off.className = 'offcut';
      off.setAttribute('aria-hidden', 'true');
      Object.assign(off.style, { left: `${side}px`, top: `${s.top}px`, width: `${OFFCUT}px`, height: `${slipH}px` });
      stage.append(off);
      offcuts.push(off);
    }
    cutAt(s.left, s.top, n * 100);
  });
  pieces.forEach((p, i) => {
    if (i > 0 && pieces[i - 1].a.y === p.a.y) cutAt(p.a.x, p.a.y, i);
  });
  strips.forEach((s, n) => cutAt(s.right, s.top, n * 100 + 99));
  cuts.sort((c1, c2) => Number(c1.getAttribute('y1')) - Number(c2.getAttribute('y1')) || Number(c1.getAttribute('x1')) - Number(c2.getAttribute('x1')));

  return { pieces, cuts, offcuts, strips, height };
}

const clipOf = (p: CutPiece) => slipClip(p.seed);

/** The slip, whole: pieces touching in their strips, nothing yet cut or fixed. */
export function toStrip(d: Laid): void {
  for (const p of d.pieces) {
    gsap.set(p.el, { x: p.a.x - p.b.x, y: p.a.y - p.b.y, rotation: 0 });
    gsap.set(p.slip, { clipPath: 'none' });
    gsap.set(p.pin, { opacity: 0, scale: PIN_DROP, y: 0 });
    gsap.set(p.ticker.firstElementChild, { yPercent: -102, y: 0 });
    if (p.letter) gsap.set([p.letter, p.leader], { opacity: 0 });
  }
  for (const c of d.cuts) gsap.set(c, { attr: { y2: Number(c.getAttribute('y1')) }, opacity: 1 });
  gsap.set(d.offcuts, { opacity: 1, y: 0 });
}

/** Everything cut, laid, pinned, lettered and numbered. */
export function toFinal(d: Laid): void {
  for (const p of d.pieces) {
    gsap.set(p.el, { x: 0, y: 0, rotation: p.turn });
    gsap.set(p.slip, { clipPath: clipOf(p) });
    gsap.set(p.pin, { opacity: 1, scale: 1, y: 0 });
    gsap.set(p.ticker.firstElementChild, { yPercent: 0, y: 0 });
    if (p.letter) gsap.set([p.letter, p.leader], { opacity: 1 });
  }
  gsap.set(d.cuts, { opacity: 0 });
  gsap.set(d.offcuts, { opacity: 0 });
}

// The steps below add to a timeline whose units are either scroll (vh) or seconds. Every
// tween waits its turn (immediateRender: false): the start state is set by toStrip().

/** cut: dashed lines drawn down each boundary, left to right, one by one. */
export function addCuts(tl: gsap.core.Timeline, d: Laid, at: number, span: number, each: number): void {
  const n = d.cuts.length;
  d.cuts.forEach((line, i) => {
    const y1 = Number(line.getAttribute('y1'));
    const y2 = Number(line.dataset.y2);
    const start = at + (n > 1 ? (i / (n - 1)) * (span - each) : 0) + signed(d.pieces[0].seed, `cut-${i}`) * each * 0.3;
    tl.fromTo(line, { attr: { y2: y1 } }, { attr: { y2 }, duration: each, ease: 'hand', immediateRender: false }, Math.max(at, start));
  });
}

/** cut: the slip parts along its lines; the offcuts at the ends fall away. */
export function addParting(tl: gsap.core.Timeline, d: Laid, at: number, span: number): void {
  for (const p of d.pieces) {
    tl.set(p.slip, { clipPath: clipOf(p) }, at);
    tl.fromTo(
      p.el,
      { x: p.a.x - p.b.x, y: p.a.y - p.b.y, rotation: 0 },
      { x: p.a.x - p.b.x + p.part, rotation: p.jolt, duration: span * 0.6, ease: 'press', immediateRender: false },
      at,
    );
  }
  tl.to(d.cuts, { opacity: 0, duration: span * 0.5, ease: 'develop', immediateRender: false }, at + span * 0.4);
  tl.fromTo(d.offcuts, { opacity: 1, y: 0 }, { opacity: 0, y: 6, duration: span * 0.7, ease: 'develop', immediateRender: false }, at);
}

/** pin: the pieces are carried apart and settle into loose rows, each turned a little. */
export function addSeparating(tl: gsap.core.Timeline, d: Laid, at: number, span: number): void {
  const n = d.pieces.length;
  const each = span * 0.75;
  d.pieces.forEach((p, i) => {
    const t = at + (n > 1 ? (i / (n - 1)) * (span - each) : 0);
    const from = { x: p.a.x - p.b.x + p.part, y: p.a.y - p.b.y, rotation: p.jolt };
    tl.fromTo(p.el, { x: from.x }, { x: 0, duration: each, ease: 'hand', immediateRender: false }, t);
    tl.fromTo(p.el, { y: from.y, rotation: from.rotation }, { y: 0, rotation: p.turn, duration: each, ease: 'settle', immediateRender: false }, t);
  });
}

/** pin, set: each piece is pinned, lettered, and its number fed out beneath it. */
export function addFixing(
  tl: gsap.core.Timeline,
  d: Laid,
  at: number,
  span: number,
  durations: { pin: number; letter: number; ticker: number },
): void {
  const n = d.pieces.length;
  const last = Math.max(durations.pin, durations.letter) + durations.ticker;
  const step = n > 1 ? (span - last) / (n - 1) : 0;
  d.pieces.forEach((p, i) => {
    const t = at + Math.max(0, i * step + signed(p.seed, 'fix') * step * 0.25);
    pressInto(tl, p.pin, { scale: PIN_DROP, opacity: 0 }, { scale: 1, opacity: 1 }, t, durations.pin);
    if (p.letter && p.leader) {
      tl.fromTo([p.letter, p.leader], { opacity: 0 }, { opacity: 1, duration: durations.letter, ease: 'press', immediateRender: false }, t + durations.pin * 0.5);
    }
    const strip = p.ticker.firstElementChild!;
    tl.fromTo(strip, { yPercent: -102 }, { yPercent: 0, duration: durations.ticker, ease: 'press', immediateRender: false }, t + durations.pin * 0.8);
  });
}

/** The machine's view of the pieces at rest: each with its space made visible, and its number. */
export function writeMachine(machine: HTMLElement, stage: HTMLElement, d: Laid): void {
  const ox = stage.offsetLeft - machine.offsetLeft;
  const oy = stage.offsetTop - machine.offsetTop;
  const items: HTMLElement[] = [];
  for (const p of d.pieces) {
    const ghost = document.createElement('span');
    ghost.className = 'machine__ghost';
    Object.assign(ghost.style, { left: `${ox + p.b.x}px`, top: `${oy + p.b.y}px`, width: `${p.w}px`, height: `${p.h}px`, rotate: `${p.turn}deg` });
    const item = document.createElement('span');
    item.className = 'machine__item';
    Object.assign(item.style, { left: `${ox + p.b.x + p.w / 2}px`, top: `${oy + p.b.y + 2}px` });
    const word = document.createElement('span');
    word.className = 'machine__piece';
    if (p.text.startsWith(' ')) word.append(spaceMark());
    word.append(p.text.replace(/^ /, '').replace(/'/g, '’'));
    const num = document.createElement('span');
    num.className = 't-machine';
    num.textContent = String(p.id);
    item.append(word, num);
    items.push(ghost, item);
  }
  machine.replaceChildren(...items);
}
