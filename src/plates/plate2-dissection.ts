// Plate II. Dissection. The specimen, re-laid on two strips, is marked with dashed cut
// lines and cut; the pieces part, separate and settle into loose rows; each is pinned,
// lettered a to t, and its number fed out beneath it on ticker tape. Below, the reader
// may lay down a sentence of their own (reader-sentence.ts).

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, createField } from '../gl/background';
import { initLoupe, initLoupeHint } from '../components/loupe';
import { LETTERS, SECOND_STRIP } from '../data/specimen';
import { PINS, PLATE2, SEEDS } from '../motion/eases';
import { COMPACT, REDUCED, WIDE, isPhone } from '../motion/media';
import { scrubFor } from '../motion/scroll';
import { addCuts, addFixing, addParting, addSeparating, lay, prepare, toFinal, toStrip, writeMachine } from './dissect';
import { initReader } from './reader-sentence';

gsap.registerPlugin(ScrollTrigger);

const span = (r: readonly [number, number]) => r[1] - r[0];

let mm: gsap.MatchMedia | null = null;
let held: ScrollTrigger | null = null;
let lastWidth = 0;
let resizeTimer = 0;

export function init(root: HTMLElement): void {
  const frame = root.querySelector<HTMLElement>('.plate__frame')!;
  const pinned = root.querySelector<HTMLElement>('.plate__pinned')!;
  const fieldEl = root.querySelector<HTMLElement>('.dissection-field')!;
  const stage = root.querySelector<HTMLElement>('.dissection__stage')!;
  const list = root.querySelector<HTMLElement>('.dissection__pieces')!;
  const machine = fieldEl.querySelector<HTMLElement>('.machine')!;
  const intro = root.querySelector<HTMLElement>('.plate__intro');
  const notes = [...root.querySelectorAll<HTMLElement>('.plate__note:not(.loupe-hint)')];
  const caption = root.querySelector<HTMLElement>('.plate__caption');
  const seed = SEEDS.plates[1];

  const field = createField(fieldEl, { seed, angle: 5, strokes: 4, overshoot: 16, bias: 0.5 });
  const pieces = prepare(list, seed, LETTERS);
  initLoupe(fieldEl);
  const hint = root.querySelector<HTMLElement>('[data-loupe-hint]');
  if (hint) initLoupeHint(hint);
  const bench = root.querySelector<HTMLElement>('.reader-bench');
  if (bench) initReader(bench);

  const proxy = { brush: 0, exposure: 0 };
  const latch = () => advanceField(field, proxy);

  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add({ wide: WIDE, compact: COMPACT, reduced: REDUCED }, (context) => {
      const { wide, reduced } = context.conditions as Record<string, boolean>;
      const d = lay(stage, list, pieces, seed, [SECOND_STRIP]);
      writeMachine(machine, stage, d);

      if (reduced) {
        toFinal(d);
        proxy.brush = 1;
        proxy.exposure = 1;
        latch();
        return;
      }

      toStrip(d);
      const pinEl = wide ? frame : pinned;
      const length = isPhone() ? PINS[2][1] : PINS[2][0];
      const k = length / PINS[2][0];
      const scrub = scrubFor('story');
      const a = PLATE2.approach;
      const p = PLATE2.pin;

      const approach = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: 'top bottom', end: wide ? 'top top' : pinStart(pinEl), scrub },
      });
      approach.fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch, immediateRender: false }, a.brush[0]);
      approach.fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(a.exposure), ease: 'develop', onUpdate: latch, immediateRender: false }, a.exposure[0]);
      if (wide && intro) approach.fromTo(intro, { opacity: 0 }, { opacity: 1, duration: span(a.intro), ease: 'develop' }, a.intro[0]);
      approach.set({}, {}, 1);

      const hold = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: wide ? 'top top' : pinStart(pinEl), end: `+=${length}%`, pin: pinEl, scrub, anticipatePin: 1 },
      });
      held = hold.scrollTrigger ?? null;
      const at = (r: readonly [number, number]) => r[0] * k;
      addCuts(hold, d, at(p.cuts), span(p.cuts) * k, PLATE2.cutDraw * k);
      addParting(hold, d, at(p.part), span(p.part) * k);
      addSeparating(hold, d, at(p.separate), span(p.separate) * k);
      addFixing(hold, d, at(p.fix), span(p.fix) * k, {
        pin: PLATE2.pinPress * k,
        letter: PLATE2.letterSet * k,
        ticker: PLATE2.tickerFeed * k,
      });
      if (wide) {
        if (notes[0]) hold.fromTo(notes[0], { opacity: 0 }, { opacity: 1, duration: span(p.note1), ease: 'develop' }, p.note1[0]);
        if (notes[1]) hold.fromTo(notes[1], { opacity: 0 }, { opacity: 1, duration: span(p.note2), ease: 'develop' }, p.note2[0]);
        if (caption) hold.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: span(p.caption), ease: 'develop' }, p.caption[0]);
      }
      hold.set({}, {}, length);

      return () => {
        held = null;
      };
    });
    ScrollTrigger.refresh();
  };

  build();
  lastWidth = window.innerWidth;
  // The layouts depend on the field's width: rebuild when it changes (not when only the
  // height does, as it does whenever a phone's toolbar slides away).
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 200);
  });
}

/** In one column the figure pins centred, unless it is taller than the screen. */
function pinStart(el: HTMLElement) {
  return () => (el.offsetHeight > window.innerHeight * 0.92 ? 'top top' : 'center center');
}

export function destroy(): void {
  mm?.revert();
  mm = null;
}

export function range(): { start: number; end: number } | null {
  return held ? { start: held.start, end: held.end } : null;
}
