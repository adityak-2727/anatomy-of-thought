// Proof IV: the recurring materials on one field, printed as the reader scrolls:
// the field is brushed and exposed, pins are pressed in, letters set, tickers fed out,
// and threads laid from "big" back to the pieces it weighs.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { advanceField, createField, type FieldHandle } from '../gl/background';
import { createPiece, displayText, pinPieces, type Piece } from '../components/piece';
import { raggedClip, spaceMark, svgEl, threadCurve, threadFibres, threadPaths } from '../components/marks';
import { tuckTicker, feedOut } from '../components/ticker';
import { initLoupe, initLoupeHint } from '../components/loupe';
import { SCRUB, SEEDS, jitterStagger, pen } from '../motion/eases';
import { setPress } from '../motion/verbs';
import { prefersReduced } from '../motion/reduced-motion';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

// Pieces 7–9 of the specimen, lettered as on Plate II.
const LETTERED = [
  { text: ' the', letter: 'g' },
  { text: ' suit', letter: 'h' },
  { text: 'case', letter: 'i' },
];

// Illustrative weights from the averaged reading at the first "big" (DESIGN-PLAN §8.3).
const ROW = [' trophy', null, ' it', "'s", ' too', ' big'] as const;
const WEIGHTS: Record<string, number> = { ' trophy': 0.37, ' it': 0.18, ' too': 0.15, "'s": 0.05 };
const MIN_WEIGHT = 0.03;
const PLY_AT = 0.3;

const threadWidth = (w: number) => 0.5 + 1.5 * Math.sqrt(w);

export interface Materials {
  field: FieldHandle;
  /** Jump the printing to a point, 0 to 1 (used by the screenshot script). */
  seek(progress: number): void;
}

export function initMaterials(section: HTMLElement, options: { shots: boolean }): Materials {
  const figure = section.querySelector<HTMLElement>('[data-loupe]')!;
  const fieldEl = section.querySelector<HTMLElement>('.materials-field')!;
  const piecesRow = fieldEl.querySelector<HTMLElement>('[data-row="pieces"]')!;
  const threadsRow = fieldEl.querySelector<HTMLElement>('[data-row="threads"]')!;
  const machine = fieldEl.querySelector<HTMLElement>('.machine')!;
  const machineText = figure.querySelector<HTMLElement>('[data-machine-text]')!;
  const seed = SEEDS.proof;
  const field = createField(fieldEl, { seed, angle: 4, strokes: 4, overshoot: 16, bias: 0.5 });

  const lettered: Piece[] = LETTERED.map((p, i) => createPiece({ text: p.text, letter: p.letter, ticker: true, seed: seed + 10 + i }));
  piecesRow.append(...lettered.map((p) => p.root));

  const rowPieces: (Piece | null)[] = ROW.map((text, i) => (text === null ? null : createPiece({ text, seed: seed + 30 + i })));
  for (const p of rowPieces) {
    if (p) {
      threadsRow.append(p.root);
    } else {
      const gap = svgEl('svg', { class: 'gap-mark', viewBox: '0 0 30 6', width: 30, height: 6, 'aria-hidden': 'true', focusable: 'false' });
      [4, 15, 26].forEach((cx) => svgEl('circle', { cx, cy: 3, r: 1.3, fill: 'currentColor' }, gap));
      threadsRow.append(gap);
    }
  }
  const threadSvg = svgEl('svg', { class: 'threads', 'aria-hidden': 'true', focusable: 'false' }, threadsRow);

  writeMachineText(machineText, lettered);
  machine.style.setProperty('--tissue-clip', raggedClip(seed + 7, 18, 2.5));

  let ctx: gsap.Context | null = null;

  const build = () => {
    ctx?.revert();
    pinPieces(lettered);
    const threads = layThreads(threadsRow, threadSvg, rowPieces);
    layMachine(machine, fieldEl, lettered, rowPieces, threads);

    ctx = gsap.context(() => {
      const reduced = prefersReduced();
      const proxy = { brush: 0, exposure: 0 };
      // A field that has been exposed stays exposed: the machine has processed it.
      const latch = () => advanceField(field, proxy);
      const pins = lettered.map((p) => p.pin!);
      const letters = lettered.flatMap((p) => [p.letter!, p.leader!]);
      const paths = threadSvg.querySelectorAll<SVGPathElement>('path');

      if (reduced) {
        proxy.brush = 1;
        proxy.exposure = 1;
        latch();
        return;
      }

      lettered.forEach((p) => tuckTicker(p.ticker!));
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: fieldEl,
          start: 'top 88%',
          end: 'center 42%',
          scrub: options.shots ? true : SCRUB.story,
        },
      });
      tl.to(proxy, { brush: 1, duration: 3, ease: 'brush', onUpdate: latch }, 0);
      tl.to(proxy, { exposure: 1, duration: 3.2, ease: 'develop', onUpdate: latch }, 1.8);
      const pinAt = jitterStagger(0.35, seed, 'pins');
      pins.forEach((pin, i) => {
        tl.add(setPress(pin, { scale: 1, opacity: 1, startAt: { scale: 1.6, opacity: 0 } }), 3.6 + pinAt(i));
      });
      tl.from(letters, { opacity: 0, duration: 0.5, ease: 'press', stagger: jitterStagger(0.18, seed, 'letters') }, 4.2);
      const feedAt = jitterStagger(0.3, seed, 'feed');
      lettered.forEach((p, i) => tl.add(feedOut(p.ticker!, p.seed), 4.6 + feedAt(i)));
      // Threads start at "big" and draw back to each earlier piece at pen speed,
      // so a longer thread takes longer. Scrub units here are three per second.
      let t = 5.4;
      paths.forEach((path) => {
        const d = pen(path.getTotalLength());
        tl.from(path, { drawSVG: '0% 0%', duration: d * 3, ease: 'hand' }, t);
        t += d * 0.9;
      });
    }, section);
  };

  const seek = (progress: number) => {
    const st = ScrollTrigger.getAll().find((s) => s.trigger === fieldEl);
    if (!st) return;
    window.scrollTo(0, st.start + (st.end - st.start) * progress);
    ScrollTrigger.update();
  };

  document.fonts.ready.then(build);
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 180);
  }).observe(fieldEl);

  initLoupe(figure);
  const hint = section.querySelector<HTMLElement>('[data-loupe-hint]');
  if (hint) initLoupeHint(hint);

  return { field, seek };
}

interface Thread {
  weight: number;
  /** Where the machine writes the weight: on the thread, near the piece it reaches. */
  label: { x: number; y: number };
}

/** Measure the row once, then lay a thread from "big" back to each piece it weighs. */
function layThreads(row: HTMLElement, svg: SVGSVGElement, pieces: (Piece | null)[]): Thread[] {
  const box = row.getBoundingClientRect();
  const anchors = pieces.map((p) => {
    if (!p) return null;
    const r = p.slip.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top - box.top + 2 };
  });
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const from = anchors[anchors.length - 1]!;
  const threads: Thread[] = [];
  pieces.forEach((p, i) => {
    if (!p || i === pieces.length - 1) return;
    const weight = WEIGHTS[p.text] ?? 0;
    if (weight < MIN_WEIGHT) return;
    const to = anchors[i]!;
    const plies = weight >= PLY_AT ? 2 : 1;
    const ds = threadPaths(from, to, p.seed, plies);
    for (const d of ds) {
      svgEl('path', { d, class: 'thread', 'stroke-width': threadWidth(weight).toFixed(2) }, svg);
    }
    // Stray fibres leave the thread and rejoin it: that is what makes it read as cotton.
    for (const d of threadFibres(from, to, p.seed, weight >= PLY_AT ? 3 : 2)) {
      svgEl('path', { d, class: 'thread thread--fuzz' }, svg);
    }
    threads.push({ weight, label: threadCurve(from, to)(0.82) });
  });
  return threads;
}

/** The machine's view: the same places, written as the machine writes them. */
function layMachine(machine: HTMLElement, fieldEl: HTMLElement, lettered: Piece[], rowPieces: (Piece | null)[], threads: Thread[]): void {
  // Positions are measured from the machine layer's own corner, which sits outside the field by the bleed.
  const field = fieldEl.getBoundingClientRect();
  const box = { left: field.left + machine.offsetLeft, top: field.top + machine.offsetTop };
  const threadsRow = fieldEl.querySelector<HTMLElement>('[data-row="threads"]')!.getBoundingClientRect();
  const items: HTMLElement[] = [];
  const ghost = (r: DOMRect) => {
    const g = document.createElement('span');
    g.className = 'machine__ghost';
    Object.assign(g.style, { left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    items.push(g);
  };
  for (const p of lettered) {
    const r = p.slip.getBoundingClientRect();
    ghost(r);
    const item = document.createElement('span');
    item.className = 'machine__item';
    Object.assign(item.style, { left: `${r.left - box.left + r.width / 2}px`, top: `${r.top - box.top + 2}px` });
    const piece = document.createElement('span');
    piece.className = 'machine__piece';
    if (p.text.startsWith(' ')) piece.append(spaceMark());
    piece.append(displayText(p.text));
    const id = document.createElement('span');
    id.className = 't-machine';
    id.textContent = String(p.id);
    item.append(piece, id);
    items.push(item);
  }
  for (const p of rowPieces) if (p) ghost(p.slip.getBoundingClientRect());
  for (const t of threads) {
    const n = document.createElement('span');
    n.className = 'machine__item t-machine';
    Object.assign(n.style, { left: `${t.label.x + threadsRow.left - box.left}px`, top: `${t.label.y + threadsRow.top - box.top - 26}px` });
    n.textContent = t.weight.toFixed(2);
    items.push(n);
  }
  machine.replaceChildren(...items);
}

/** The same numbers as real text, for screen readers. */
function writeMachineText(host: HTMLElement, lettered: Piece[]): void {
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'The machine’s view of Fig. 2';
  const head = document.createElement('tr');
  for (const h of ['Letter', 'Piece', 'ID']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    head.append(th);
  }
  table.append(caption, head);
  lettered.forEach((p, i) => {
    const tr = document.createElement('tr');
    const cells = [LETTERED[i].letter, p.text.startsWith(' ') ? `space, ${displayText(p.text)}` : displayText(p.text), String(p.id)];
    for (const c of cells) {
      const td = document.createElement('td');
      td.textContent = c;
      tr.append(td);
    }
    table.append(tr);
  });
  const weights = document.createElement('p');
  weights.textContent = 'Threads from big: trophy 0.37, it 0.18, too 0.15, ’s 0.05.';
  host.replaceChildren(table, weights);
}
