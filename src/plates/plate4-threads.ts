// Plate IV. The threads of attention. A needle reads the specimen one piece at a time;
// at each piece, threads draw back to the earlier pieces it weighs, never ahead. The
// clue arrives at big and is tied back to trophy. At rest the reader may change big to
// small (the threads swing to suit and case, the old ones left as a ghost) and look
// through one reader at a time. Fig. 4b, inside the field, follows the sense of it.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, createField } from '../gl/background';
import { initLoupe } from '../components/loupe';
import { needleMark, svgEl } from '../components/marks';
import { strongest, weights, type View } from '../data/attention';
import { spokenPiece } from '../data/chart';
import { LETTERS, PIECES, type Variant } from '../data/specimen';
import { DUR, PINS, PLATE4, SEEDS } from '../motion/eases';
import { COMPACT, STILL, WIDE, isPhone } from '../motion/media';
import { scrubFor } from '../motion/scroll';
import { developOnArrival, setPress } from '../motion/verbs';
import { flags } from '../flags';
import { getState, setState, subscribe } from '../state';
import { layRow, type Row } from './threads/layout';
import { drawTo, weave, type Group } from './threads/weave';
import { createInset } from './threads/inset';
import { writeThreadsMachine } from './threads/machine';

gsap.registerPlugin(ScrollTrigger);

const STEPS = 20;
const span = (r: readonly [number, number]) => r[1] - r[0];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const ANNOUNCE: Record<Variant, string> = {
  small: 'Now the suitcase is too small. The threads lead to suitcase.',
  big: 'Now the trophy is too big. The threads lead to trophy.',
};

let mm: gsap.MatchMedia | null = null;
let held: ScrollTrigger | null = null;
let teardown: (() => void) | null = null;

export function init(root: HTMLElement): void {
  const frameEl = root.querySelector<HTMLElement>('.plate__frame')!;
  // On a phone only the field and its notes stay pinned; the captions follow them.
  const pinned = root.querySelector<HTMLElement>('.threads__pin')!;
  const fieldEl = root.querySelector<HTMLElement>('.threads-field')!;
  const stage = fieldEl.querySelector<HTMLElement>('.threads__stage')!;
  const items = [...stage.querySelectorAll<HTMLElement>('.read-piece')];
  const slips = items.map((li) => li.querySelector<HTMLElement>('.slip')!);
  const machineEl = fieldEl.querySelector<HTMLElement>('.machine')!;
  const insetEl = fieldEl.querySelector<HTMLElement>('.inset')!;
  const notesEl = root.querySelector<HTMLElement>('.thread-notes')!;
  const notes = [...notesEl.querySelectorAll<HTMLElement>('.thread-note')];
  const intro = root.querySelector<HTMLElement>('.plate__intro');
  const switchEl = root.querySelector<HTMLButtonElement>('.variant-switch')!;
  const status = root.querySelector<HTMLElement>('.variant-status');
  const answer = root.querySelector<HTMLElement>('[data-answer]');
  const table = root.querySelector<HTMLElement>('[data-strongest]');
  const seed = SEEDS.plates[3];
  const shots = flags().shots;

  const field = createField(fieldEl, { seed, angle: -1, strokes: 3, overshoot: 20, bias: 0.45 });
  const proxy = { brush: 0, exposure: 0 };
  const latch = () => advanceField(field, proxy);

  // Layers over the row: the faint letters of pieces not yet read, the threads, the ghosts, the needle.
  const svgNS = (cls: string) => svgEl('svg', { class: cls, 'aria-hidden': 'true', focusable: 'false' });
  const faint = svgNS('threads__faint');
  const live = svgNS('threads');
  const ghosts = svgNS('threads threads--ghosts');
  stage.prepend(faint);
  stage.append(ghosts, live);
  const needle = needleMark(seed);
  needle.classList.add('threads__needle');
  stage.append(needle);
  const faintTexts: SVGTextElement[] = [];

  const inset = createInset(insetEl, getState().variant);
  initLoupe(fieldEl);

  // ─── State ────────────────────────────────────────────────────────────────
  const reading = { s: 0 };
  const lettering = { v: 0 };
  const swing = { t: 1 };
  let variant: Variant = getState().variant;
  let view: View = 'all';
  let layout: Row | null = null;
  let cache = new Map<string, Group>();
  let shown = new Set<Group>();
  let step = -1;
  let machineKey = '';
  let note = -2;
  let still = false;
  let dirty = true;
  const ghostOpacity = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--o-ghost')) || 0.16;
  const invalidate = () => {
    dirty = true;
  };

  const texts = () => PIECES[variant];

  function group(i: number): Group {
    const key = `${variant}|${view}|${i}`;
    let g = cache.get(key);
    if (!g) {
      g = weave(i, weights(variant, view)[i], layout!, seed);
      cache.set(key, g);
    }
    return g;
  }

  // ─── The notes: each replaces the last, in step with the needle ────────────
  function showNote(index: number): void {
    if (index === note || still) return;
    const previous = notes[note];
    note = index;
    const next = notes[index];
    if (previous) gsap.to(previous, { opacity: 0, duration: shots ? 0 : DUR.crossfade, ease: 'none', overwrite: true });
    if (next) gsap.to(next, { opacity: 1, duration: shots ? 0 : PLATE4.noteDevelop, ease: 'develop', delay: shots || !previous ? 0 : DUR.crossfade, overwrite: true });
  }

  // ─── One frame of the reading ──────────────────────────────────────────────
  function render(): void {
    if (!layout) return;
    const s = Math.min(STEPS, Math.max(0, reading.s));
    const k = Math.max(1, Math.min(STEPS, Math.ceil(s))); // the step under way, 1–20
    const u = s === 0 ? 0 : s - (k - 1);                   // how far through it
    const { moved, laid, drawn } = PLATE4.step;
    const settle = gsap.parseEase('settle');

    // The pieces: read ones laid as white slips, the rest faint on the blue.
    for (let i = 0; i < STEPS; i++) {
      const on = i < k - 1 ? 1 : i === k - 1 ? clamp01((u - laid[0]) / (laid[1] - laid[0])) : 0;
      slips[i].style.opacity = on.toFixed(3);
      faintTexts[i]?.style.setProperty('opacity', ((1 - on) * lettering.v).toFixed(3));
    }

    // The needle: it moves from the last piece to this one, then rests over it.
    const to = layout.needle[k - 1];
    const fromPt = k > 1 ? layout.needle[k - 2] : { x: to.x - 48, y: to.y };
    const m = settle(clamp01(u / moved));
    const nx = fromPt.x + (to.x - fromPt.x) * m;
    const ny = fromPt.y + (to.y - fromPt.y) * m;
    needle.style.transform = `translate(${nx.toFixed(1)}px, ${ny.toFixed(1)}px) rotate(${layout.vertical ? 90 : 0}deg)`;
    needle.style.opacity = (s > 0 ? Math.min(1, s * 8) : 0).toFixed(3);

    // Threads: this piece's drawing, the last piece's falling to a ghost, the one before going.
    const fall = gsap.parseEase('develop')(clamp01(u / moved));
    const want = new Map<Group, number>();
    const current = group(k - 1);
    want.set(current, 1);
    if (k >= 2 && !still) want.set(group(k - 2), 1 - (1 - ghostOpacity) * fall);
    if (k >= 3 && !still) want.set(group(k - 3), ghostOpacity * (1 - fall));
    for (const g of shown) {
      if (!want.has(g)) {
        g.g.remove();
        shown.delete(g);
      }
    }
    for (const [g, opacity] of want) {
      if (!shown.has(g)) {
        live.append(g.g);
        shown.add(g);
      }
      g.g.style.opacity = opacity.toFixed(3);
      drawTo(g, g === current ? clamp01((u - moved) / (drawn - moved)) * swing.t : 1);
    }

    // A new step clears any ghost left by a switch.
    if (k !== step) {
      step = k;
      if (ghosts.childElementCount) {
        gsap.killTweensOf(ghosts.children);
        ghosts.replaceChildren();
      }
    }

    // Notes, Fig. 4b and the machine's view follow the needle.
    const [n1, n2, n3] = PLATE4.notesAt;
    const at = (n: number) => s >= n - 1 + moved;
    showNote(at(n3) ? 2 : at(n2) ? 1 : at(n1) ? 0 : -1);
    const [d0, d1] = PLATE4.drift;
    inset.setDrift(gsap.parseEase('settle')(clamp01((s - (d0 - 1 + moved)) / (d1 - d0))));
    const key = `${variant}|${view}|${k}`;
    if (key !== machineKey) {
      machineKey = key;
      const offset = { x: stage.offsetLeft + bleed, y: stage.offsetTop + bleed };
      writeThreadsMachine(machineEl, layout, offset, texts(), k - 1, current.labels.length ? current : null, weights(variant, view)[k - 1][k - 1]);
    }
  }
  const bleed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-bleed')) || 0;

  const tick = () => {
    if (!dirty) return;
    dirty = false;
    render();
  };
  gsap.ticker.add(tick);

  // ─── Laying the row out ───────────────────────────────────────────────────
  function lay(keepGhosts = false): void {
    stage.classList.add('is-laid');
    layout = layRow(stage, items, seed);
    fieldEl.classList.toggle('is-vertical', layout.vertical);
    for (const svg of [faint, live, ghosts]) {
      svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
      svg.setAttribute('width', String(layout.width));
      svg.setAttribute('height', String(layout.height));
    }
    faint.replaceChildren();
    faintTexts.length = 0;
    const row = layout;
    texts().forEach((t, i) => {
      const slot = row.slots[i];
      const text = svgEl('text', {
        x: row.letters[i].x,
        y: row.letters[i].y,
        class: 'threads__faint-text',
        'dominant-baseline': 'central',
        transform: `rotate(${slot.turn.toFixed(2)} ${slot.x + slot.w / 2} ${slot.y + slot.h / 2})`,
      }, faint);
      text.textContent = t.replace(/^ /, '').replace(/'/g, '’');
      faintTexts.push(text);
    });
    cache = new Map();
    for (const g of shown) g.g.remove();
    shown = new Set();
    if (!keepGhosts) {
      ghosts.replaceChildren();
      step = -1;
    }
    machineKey = '';
    inset.layout();
    inset.setVariant(variant, false);
    dirty = true;
  }

  // ─── The switch and the readers: answers in time, on a still page ──────────
  function leaveGhost(fade: number, to: number, ease: string): void {
    for (const g of shown) {
      const copy = g.g.cloneNode(true) as SVGGElement;
      ghosts.append(copy);
      gsap.to(copy, { opacity: to * Number(g.g.style.opacity || 1), duration: still ? DUR.crossfade : fade, ease, onComplete: () => (to === 0 ? copy.remove() : undefined) });
    }
  }

  function redraw(duration: number): void {
    if (still || shots) {
      swing.t = 1;
      dirty = true;
      return;
    }
    gsap.fromTo(swing, { t: 0 }, { t: 1, duration, ease: 'hand', onUpdate: invalidate });
  }

  function applyVariant(next: Variant, animate: boolean): void {
    if (next === variant && animate) return;
    const changed = next !== variant;
    variant = next;
    switchEl.querySelector('.sens__label')!.textContent = switchEl.dataset[next === 'big' ? 'big' : 'small'] ?? '';
    for (const n of notes) if (n.dataset[next]) n.textContent = n.dataset[next]!;
    if (answer?.dataset[next]) answer.textContent = answer.dataset[next]!;
    const text = PIECES[next];
    items.forEach((li, i) => {
      if (li.dataset.piece === text[i]) return;
      li.dataset.piece = text[i];
      slips[i].textContent = text[i].replace(/^ /, '').replace(/'/g, '’');
      if (faintTexts[i]) faintTexts[i].textContent = slips[i].textContent;
      if (animate && !still) setPress(slips[i], { y: 0, startAt: { y: -2 }, duration: PLATE4.reset });
    });
    writeTable();
    if (!changed) return;
    if (animate) {
      leaveGhost(PLATE4.ghostFall, ghostOpacity, 'tone');
      if (status) status.textContent = ANNOUNCE[next];
    }
    machineKey = '';
    inset.setVariant(next, animate && !still);
    redraw(PLATE4.swing);
    // The row is laid again: small is not as wide as big. The ghost stays where it fell.
    lay(true);
  }

  function writeTable(): void {
    if (!table) return;
    const rows = [...table.querySelectorAll('tr')];
    PIECES[variant].forEach((piece, i) => {
      const cells = rows[i]?.children;
      if (!cells) return;
      const s = strongest(variant, 'all', i);
      cells[0].textContent = `${LETTERS[i]}, ${spokenPiece(piece)}`;
      cells[1].textContent = s ? `${LETTERS[s.j]}, ${spokenPiece(PIECES[variant][s.j])}` : 'only itself';
      cells[2].textContent = s ? s.w.toFixed(2) : '1.00';
    });
  }

  switchEl.addEventListener('click', () => setState({ variant: variant === 'big' ? 'small' : 'big' }));
  const unsubscribe = subscribe((state, changed) => {
    if (changed.includes('variant')) applyVariant(state.variant, true);
  });

  root.querySelectorAll<HTMLInputElement>('.readers input').forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      leaveGhost(PLATE4.readerFade, 0, 'none');
      view = input.value === 'all' ? 'all' : (Number(input.value) as View);
      machineKey = '';
      for (const g of shown) g.g.remove();
      shown = new Set();
      redraw(PLATE4.readerDraw);
    });
  });

  // ─── The sequence ─────────────────────────────────────────────────────────
  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add({ wide: WIDE, compact: COMPACT, reduced: STILL }, (context) => {
      const { wide, reduced } = context.conditions as Record<string, boolean>;
      lay();
      applyVariant(variant, false);

      if (reduced) {
        still = true;
        notesEl.classList.add('is-still');
        reading.s = STEPS;
        lettering.v = 1;
        proxy.brush = 1;
        proxy.exposure = 1;
        latch();
        dirty = true;
        return () => {
          still = false;
          notesEl.classList.remove('is-still');
        };
      }

      notesEl.classList.add('is-live');
      gsap.set(notes, { opacity: 0 });
      note = -1;
      reading.s = 0;
      lettering.v = 0;

      const pinEl = wide ? frameEl : pinned;
      const length = isPhone() ? PINS[4][1] : PINS[4][0];
      const k = length / PINS[4][0];
      const at = (v: number) => v * k;
      const scrub = scrubFor('story');
      const a = PLATE4.approach;

      const approach = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: 'top bottom', end: wide ? 'top top' : pinStart(pinEl), scrub },
      });
      approach.fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch, immediateRender: false }, a.brush[0]);
      approach.fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(a.exposure), ease: 'develop', onUpdate: latch, immediateRender: false }, a.exposure[0]);
      approach.fromTo(lettering, { v: 0 }, { v: 1, duration: span(a.lettering), ease: 'develop', onUpdate: invalidate, immediateRender: false }, a.lettering[0]);
      approach.set({}, {}, 1);
      if (wide && intro) developOnArrival(intro, scrub);

      const hold = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: wide ? 'top top' : pinStart(pinEl), end: `+=${length}%`, pin: pinEl, scrub, anticipatePin: 1 },
      });
      held = hold.scrollTrigger ?? null;

      // Twenty steps, each given its share of the reading; it and the first big get more room.
      const room = Array.from({ length: STEPS }, (_, i) => PLATE4.stepRoom[i === 0 ? 'first' : String(i + 1)] ?? (i < 10 ? PLATE4.stepRoom.early : PLATE4.stepRoom.default));
      const scale = at(span(PLATE4.pin.reading)) / room.reduce((sum, r) => sum + r, 0);
      let t = at(PLATE4.pin.reading[0]);
      room.forEach((r, i) => {
        hold.fromTo(reading, { s: i }, { s: i + 1, duration: r * scale, ease: 'none', onUpdate: invalidate, immediateRender: false }, t);
        t += r * scale;
      });
      hold.set({}, {}, length);
      dirty = true;

      return () => {
        held = null;
        notesEl.classList.remove('is-live');
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

  teardown = () => {
    gsap.ticker.remove(tick);
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
