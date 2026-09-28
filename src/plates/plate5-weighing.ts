// Plate V. The weighing. The reply has begun with "The"; the machine weighs what comes
// next. The card's rules and names are set, and each bar exposes to its likelihood, its
// number fed out on ticker tape. At rest the temperature can be turned, and the lever
// draws a piece from the likelihoods as they stand, with a tally of the last ten draws.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, createField } from '../gl/background';
import { initLoupe } from '../components/loupe';
import { leverMark, pinMark, svgEl, tallyPaths } from '../components/marks';
import { SCORES, type Variant } from '../data/specimen';
import { percent, sample, softmax } from '../lib/softmax';
import { PINS, PLATE5, SEEDS, pen } from '../motion/eases';
import { COMPACT, STILL, WIDE, isPhone } from '../motion/media';
import { mulberry32 } from '../motion/random';
import { scrubFor } from '../motion/scroll';
import { developOnArrival, setPress } from '../motion/verbs';
import { flags } from '../flags';
import { getState, subscribe } from '../state';
import { initDial } from './weighing/dial';

gsap.registerPlugin(ScrollTrigger);

const span = (r: readonly [number, number]) => r[1] - r[0];
/** The tally keeps the last ten draws. */
const KEEP = 10;

let mm: gsap.MatchMedia | null = null;
let held: ScrollTrigger | null = null;
let teardown: (() => void) | null = null;

export function init(root: HTMLElement): void {
  const frameEl = root.querySelector<HTMLElement>('.plate__frame')!;
  const fieldEl = root.querySelector<HTMLElement>('.weigh-field')!;
  const reply = fieldEl.querySelector<HTMLElement>('.weigh-reply__set')!;
  const rows = [...fieldEl.querySelectorAll<HTMLTableRowElement>('.weigh-row')];
  const names = rows.map((r) => r.querySelector<HTMLElement>('.weigh-name')!);
  const strips = rows.map((r) => r.querySelector<HTMLElement>('.weigh-bar__strip')!);
  const tickers = rows.map((r) => r.querySelector<HTMLElement>('.weigh-likelihood')!);
  const tallies = rows.map((r) => r.querySelector<HTMLElement>('.weigh-tally')!);
  const lever = fieldEl.querySelector<HTMLButtonElement>('.lever')!;
  const drawn = fieldEl.querySelector<HTMLElement>('.drawn')!;
  const drawnWord = drawn.querySelector<HTMLElement>('[data-drawn]')!;
  const machineEl = fieldEl.querySelector<HTMLElement>('.machine')!;
  const notes = [...root.querySelectorAll<HTMLElement>('.plate__note')];
  const variantNote = root.querySelector<HTMLElement>('.weigh-variant-note');
  const intro = root.querySelector<HTMLElement>('.plate__intro');
  const caption = root.querySelector<HTMLElement>('.plate__caption');
  const status = root.querySelector<HTMLElement>('.draw-status');
  const scoreTable = root.querySelector<HTMLElement>('[data-scores]');
  const seed = SEEDS.plates[4];
  const shots = flags().shots;

  const field = createField(fieldEl, { seed, angle: 9, strokes: 3, overshoot: 16, bias: 0.5 });
  const proxy = { brush: 0, exposure: 0 };
  const latch = () => advanceField(field, proxy);
  initLoupe(fieldEl);

  // The lever, drawn, and the pin that holds "Drawn: …".
  const { svg: leverSvg, handle } = leverMark(seed);
  lever.querySelector('.lever__art')!.append(leverSvg);
  gsap.set(handle, { svgOrigin: '0 0' });
  const drawnPin = pinMark(seed + 3, { x: -3, y: -3, w: 1, h: 1 });
  drawn.querySelector('.drawn__slip')!.append(drawnPin);

  // ─── State ────────────────────────────────────────────────────────────────
  let variant: Variant = getState().variant;
  let temperature = 1;
  let likelihood: number[] = [];
  const shown = new Array(rows.length).fill(0);   // the lengths the bars show, tweened
  const grown = rows.map(() => ({ v: 0 }));        // how far each bar has exposed in the story
  let draws: number[] = [];
  let still = false;
  const random = shots ? mulberry32(seed) : Math.random;
  const scores = () => SCORES[variant].map((c) => c.score);

  function renderBars(): void {
    strips.forEach((s, i) => {
      s.style.transform = `scaleX(${(shown[i] * grown[i].v).toFixed(4)})`;
    });
  }

  /** Weigh again: the likelihoods from the live softmax, the bars finding their lengths. */
  function weigh(animate: boolean): void {
    likelihood = softmax(scores(), temperature);
    tickers.forEach((t, i) => {
      const text = percent(likelihood[i]);
      if (t.textContent === text) return;
      t.textContent = text;
      if (animate && !still) setPress(t, { y: 0, startAt: { y: -1 }, duration: PLATE5.reset });
    });
    gsap.killTweensOf(shown);
    const to = Object.fromEntries(likelihood.map((p, i) => [i, p]));
    if (animate && !still) gsap.to(shown, { ...to, duration: PLATE5.reweigh, ease: 'settle', onUpdate: renderBars });
    else {
      likelihood.forEach((p, i) => (shown[i] = p));
      renderBars();
    }
    writeMachine();
  }

  /** The machine's view: the scores before weighing, where the likelihoods stand. */
  function writeMachine(): void {
    const items = SCORES[variant].map((c, i) => {
      const item = document.createElement('span');
      item.className = 'machine__score t-machine';
      item.textContent = c.score.toFixed(1);
      item.style.setProperty('--row', String(i));
      return item;
    });
    const note = document.createElement('p');
    note.className = 'machine__note machine__weigh-note';
    note.textContent = 'Under the loupe, the scores before weighing.';
    machineEl.replaceChildren(...items, note);
    placeMachine();
  }

  function placeMachine(): void {
    const field = fieldEl.getBoundingClientRect();
    const bleed = machineEl.offsetLeft;
    const items = machineEl.querySelectorAll<HTMLElement>('.machine__score');
    const boxes = tickers.map((t) => t.getBoundingClientRect());
    items.forEach((item, i) => {
      item.style.left = `${boxes[i].left - field.left - bleed}px`;
      item.style.top = `${boxes[i].top - field.top - bleed}px`;
    });
  }

  function writeTally(row: number, drawNew: boolean): void {
    const count = draws.filter((d) => d === row).length;
    const svg = svgEl('svg', { class: 'tally', viewBox: '-2 0 56 14', 'aria-hidden': 'true', focusable: 'false' });
    const paths = tallyPaths(count, seed + row).map((d) => svgEl('path', { d, pathLength: 1 }, svg));
    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = count ? `${count} of the last ${draws.length}` : 'none';
    tallies[row].replaceChildren(svg, label);
    const last = paths[paths.length - 1];
    if (drawNew && last && !still) gsap.fromTo(last, { strokeDasharray: '0 1' }, { strokeDasharray: '1 0', duration: pen(16), ease: 'hand' });
  }

  function setRows(): void {
    SCORES[variant].forEach((c, i) => {
      names[i].textContent = c.piece.trim();
      rows[i].dataset.piece = c.piece;
    });
    if (scoreTable) {
      [...scoreTable.querySelectorAll('tr')].forEach((tr, i) => {
        const c = SCORES[variant][i];
        tr.children[0].textContent = c.piece.trim();
        tr.children[1].textContent = c.score.toFixed(1);
      });
    }
    if (variantNote && variantNote.hidden !== (variant !== 'small')) {
      variantNote.hidden = variant !== 'small';
      // In one column the note stands above the field, so the pins from here down move with it.
      ScrollTrigger.refresh();
    }
  }

  // ─── Drawing a piece ──────────────────────────────────────────────────────
  lever.addEventListener('click', () => {
    const i = sample(likelihood, random());
    const piece = SCORES[variant][i].piece.trim();
    draws.push(i);
    let dropped = -1;
    if (draws.length > KEEP) dropped = draws.shift()!;
    if (dropped >= 0 && dropped !== i) {
      const strokes = tallies[dropped].querySelectorAll('path');
      const oldest = strokes[strokes.length - 1];
      if (oldest && !still) gsap.to(oldest, { opacity: 0, duration: PLATE5.tallyFade, ease: 'none', onComplete: () => writeTally(dropped, false) });
      else writeTally(dropped, false);
    }
    writeTally(i, true);

    drawnWord.textContent = piece;
    const first = drawn.hidden;
    drawn.hidden = false;
    if (!still) {
      gsap.timeline()
        .to(handle, { rotation: 38, duration: PLATE5.pull, ease: 'press' })
        .to(handle, { rotation: 0, duration: PLATE5.release, ease: 'settle' });
      if (first) gsap.fromTo(drawn, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: PLATE5.drawnPin, ease: 'settle' });
      else setPress(drawn, { y: 0, startAt: { y: -2 }, duration: PLATE5.drawnPin });
    }

    if (status) {
      const counts = SCORES[variant]
        .map((c, k) => ({ word: c.piece.trim(), n: draws.filter((d) => d === k).length }))
        .filter((c) => c.n > 0)
        .sort((a, b) => b.n - a.n)
        .map((c) => `${c.word} ${c.n}`)
        .join(', ');
      status.textContent = `Drawn: ${piece}. In the last ${draws.length === 1 ? 'draw' : `${draws.length} draws`}: ${counts}.`;
    }
  });

  const dial = initDial(root.querySelector<HTMLElement>('.dial')!, seed, (t, animate) => {
    temperature = t;
    weigh(animate);
  }, () => still);

  const unsubscribe = subscribe((state, changed) => {
    if (!changed.includes('variant')) return;
    variant = state.variant;
    draws = [];
    tallies.forEach((_, i) => writeTally(i, false));
    drawn.hidden = true;
    setRows();
    weigh(true);
  });

  // ─── The sequence ─────────────────────────────────────────────────────────
  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add({ wide: WIDE, compact: COMPACT, reduced: STILL }, (context) => {
      const { wide, reduced } = context.conditions as Record<string, boolean>;
      setRows();
      tallies.forEach((_, i) => writeTally(i, false));
      weigh(false);

      if (reduced) {
        still = true;
        for (const g of grown) g.v = 1;
        renderBars();
        proxy.brush = 1;
        proxy.exposure = 1;
        latch();
        return () => {
          still = false;
        };
      }

      for (const g of grown) g.v = 0;
      renderBars();
      // In one column only the field pins; the caption follows it, so the pin fits a
      // phone's screen (Phase 8).
      const pinEl = wide ? frameEl : fieldEl;
      const length = isPhone() ? PINS[5][1] : PINS[5][0];
      const k = length / PINS[5][0];
      const at = (v: number) => v * k;
      const scrub = scrubFor('story');
      const a = PLATE5.approach;
      const p = PLATE5.pin;

      const approach = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: 'top bottom', end: wide ? 'top top' : pinStart(pinEl), scrub },
      });
      approach.fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch, immediateRender: false }, a.brush[0]);
      approach.fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(a.exposure), ease: 'develop', onUpdate: latch, immediateRender: false }, a.exposure[0]);
      approach.set({}, {}, 1);
      if (wide && intro) developOnArrival(intro, scrub);

      const hold = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: wide ? 'top top' : pinStart(pinEl), end: `+=${length}%`, pin: pinEl, scrub, anticipatePin: 1 },
      });
      held = hold.scrollTrigger ?? null;

      // "The" is set into its slot; the rules and names are set, row by row.
      hold.fromTo(reply, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: at(span(p.set)), ease: 'press', immediateRender: false }, at(p.set[0]));
      const rowStep = (at(span(p.rules)) * 0.6) / rows.length;
      rows.forEach((row, i) => {
        hold.fromTo(row, { opacity: 0 }, { opacity: 1, duration: at(span(p.rules)) * 0.4, ease: 'press', immediateRender: false }, at(p.rules[0]) + i * rowStep);
      });
      // Each bar exposes to its length, taking time in proportion to it; its ticker feeds out as it ends.
      const barSpan = at(span(p.bars));
      grown.forEach((g, i) => {
        const start = at(p.bars[0]) + i * barSpan * 0.03;
        const duration = Math.max(barSpan * 0.08, barSpan * 0.7 * likelihood[i]);
        hold.fromTo(g, { v: 0 }, { v: 1, duration, ease: 'develop', onUpdate: renderBars, immediateRender: false }, start);
        hold.fromTo(tickers[i], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: barSpan * 0.06, ease: 'press', immediateRender: false }, start + duration);
      });
      if (wide) {
        for (const note of notes) hold.fromTo(note, { opacity: 0 }, { opacity: 1, duration: at(span(p.note)), ease: 'develop', immediateRender: false }, at(p.note[0]));
        if (caption) hold.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: at(span(p.caption)), ease: 'develop', immediateRender: false }, at(p.caption[0]));
      }
      hold.set({}, {}, length);
      return () => {
        held = null;
      };
    });
    ScrollTrigger.refresh();
  };

  build();
  let lastWidth = window.innerWidth;
  let resizeTimer = 0;
  const onResize = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 200);
  };
  window.addEventListener('resize', onResize);
  // The machine's view is placed from the table once it is laid out.
  requestAnimationFrame(placeMachine);

  teardown = () => {
    dial.destroy();
    unsubscribe();
    window.removeEventListener('resize', onResize);
  };
}

/** In one column the figure pins centred, unless it is taller than the screen. */
function pinStart(el: HTMLElement) {
  return () => (el.offsetHeight > window.innerHeight * 0.92 ? 'top top' : 'center center');
}

export function destroy(): void {
  mm?.revert();
  mm = null;
  teardown?.();
  teardown = null;
}

export function range(): { start: number; end: number } | null {
  return held ? { start: held.start, end: held.end } : null;
}
