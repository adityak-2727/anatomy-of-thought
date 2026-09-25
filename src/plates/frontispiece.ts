// The frontispiece: the atlas's one untriggered moment (BRIEF §6).
//
// On arrival the sensitiser is brushed on in four strokes, then the field develops from
// yellow-green to Prussian blue, centre first. The title and subtitle lay under the
// sensitiser, so they hold its yellow-green for a moment and then wash white, from the
// centre out, as unexposed sensitiser does. The emblem's pin is pressed in; the imprint
// and hint are printed on the paper below. Any scroll, click or key skips to the end.

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { createField, type FieldHandle } from '../gl/background';
import { pinMark } from '../components/marks';
import { FRONT, PIN_DROP, SEEDS, vary } from '../motion/eases';
import { setPress } from '../motion/verbs';
import { rand } from '../motion/random';

gsap.registerPlugin(SplitText);

const SKIP_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'] as const;

interface Silhouette {
  paper: SplitText;
  sensitised: SplitText;
  copy: HTMLElement;
}

let root: HTMLElement;
let fieldEl: HTMLElement;
let field: FieldHandle;
let seed: number = SEEDS.frontispiece;
let tl: gsap.core.Timeline | null = null;
let layers: Silhouette[] = [];
let pin: SVGSVGElement | null = null;

export function init(el: HTMLElement): void {
  root = el;
  fieldEl = root.querySelector<HTMLElement>('.frontispiece__field')!;
  field = createField(fieldEl, { seed, angle: -2, strokes: 4, overshoot: 18, bias: 0.7 });
  // From here the sequence, not the CSS safety net, decides what is visible.
  root.classList.add('front-ready');
  placeEmblemPin();
}

/** Start the sequence, or show its end state when it shouldn't run. */
export function begin(options: { play: boolean }): void {
  if (!options.play) {
    build().progress(1);
    return;
  }
  build().play(0);
  listen(true);
}

/** Reduced motion: the page as it stands once printed. */
export function developed(): void {
  tl?.kill();
  tl = null;
  Object.assign(field.state, { brush: 1, exposure: 1, strokeT: null });
  field.invalidate();
  gsap.set(root.querySelectorAll('.frontispiece__imprint, .frontispiece__hint'), { opacity: 1 });
  if (pin) gsap.set(pin, { opacity: 1, scale: 1, y: 0 });
}

/** Print it again, with a fresh brushing: no two cyanotypes are alike. */
export function replay(): void {
  seed += 1;
  field.style.seed = seed;
  build().play(0);
  listen(true);
}

/** Jump to a point in the sequence (screenshots). */
export function seek(progress: number): void {
  (tl ?? build()).progress(progress).pause();
}

export function destroy(): void {
  listen(false);
  tl?.kill();
  for (const l of layers) {
    l.paper.revert();
    l.sensitised.revert();
  }
}

function skip(event: Event): void {
  // Layout work can nudge the scroll by a pixel; only a real scroll counts.
  if (event.type === 'scroll' && window.scrollY < 4) return;
  if (tl && tl.progress() < 1) tl.progress(1);
}

function listen(on: boolean): void {
  for (const type of SKIP_EVENTS) {
    if (on) window.addEventListener(type, skip, { passive: true, capture: true });
    else window.removeEventListener(type, skip, { capture: true });
  }
}

function placeEmblemPin(): void {
  const slip = root.querySelector<HTMLElement>('.emblem__slip');
  if (!slip) return;
  pin?.remove();
  const inset = { x: 7, y: 6 };
  pin = pinMark(seed + 5, { x: -inset.x, y: -inset.y, w: slip.offsetWidth, h: slip.offsetHeight }, -140);
  pin.style.left = `${inset.x}px`;
  pin.style.top = `${inset.y}px`;
  slip.parentElement!.append(pin);
  gsap.set(pin, { opacity: 0 });
}

/**
 * Lay a sensitiser-coloured copy of a line of type directly beneath it. Both are split
 * the same way, so every letter of the copy sits exactly under its twin.
 */
function silhouette(el: HTMLElement): Silhouette {
  let wrap = el.parentElement!;
  let copy = wrap.querySelector<HTMLElement>(':scope > .silhouette__sensitised');
  if (!wrap.classList.contains('silhouette') || !copy) {
    wrap = document.createElement('div');
    wrap.className = 'silhouette';
    el.before(wrap);
    copy = document.createElement('div');
    copy.className = `${el.className} silhouette__sensitised`;
    copy.setAttribute('aria-hidden', 'true');
    // Clone the markup, not just the words: a nowrap span must hold in both, or the
    // copy could break its lines differently from the original.
    copy.append(...[...el.childNodes].map((node) => node.cloneNode(true)));
    wrap.append(copy, el);
  }
  const text = el.textContent ?? '';
  const paper = SplitText.create(el, { type: 'words,chars', aria: 'none' });
  // Screen readers get the line whole, not letter by letter; the split letters are hidden
  // from them. (An aria-label would do it for the heading but is not allowed on a paragraph.)
  for (const word of paper.words) word.setAttribute('aria-hidden', 'true');
  const spoken = document.createElement('span');
  spoken.className = 'visually-hidden';
  spoken.textContent = text;
  el.prepend(spoken);
  return {
    paper,
    sensitised: SplitText.create(copy, { type: 'words,chars', aria: 'none' }),
    copy,
  };
}

/** Letters nearer the centre of the field wash white first, as the centre develops first. */
function washDelays(chars: Element[]): number[] {
  const f = fieldEl.getBoundingClientRect();
  const cx = f.left + f.width / 2;
  const cy = f.top + f.height / 2;
  const reach = Math.hypot(f.width, f.height) / 2;
  return chars.map((c, i) => {
    const r = c.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) / reach;
    return d * FRONT.washSpread + rand(seed, `wash-${i}`) * FRONT.washJitter;
  });
}

function build(): gsap.core.Timeline {
  tl?.kill();
  for (const l of layers) {
    l.paper.revert();
    l.sensitised.revert();
  }
  const lines = [root.querySelector<HTMLElement>('.frontispiece__title')!, root.querySelector<HTMLElement>('.frontispiece__subtitle')!];
  layers = lines.map(silhouette);
  if (pin) gsap.set(pin, { opacity: 0 });

  const strokes = { s0: 0, s1: 0, s2: 0, s3: 0 };
  const sync = () => {
    const t: [number, number, number, number] = [strokes.s0, strokes.s1, strokes.s2, strokes.s3];
    field.state.strokeT = t;
    field.state.brush = Math.max(...t);
    field.invalidate();
  };
  const redraw = () => field.invalidate();

  const t = gsap.timeline({
    paused: true,
    onComplete: () => {
      listen(false);
      // Once brushed, the field no longer needs its strokes timed by hand.
      Object.assign(field.state, { brush: 1, strokeT: null });
      field.invalidate();
    },
  });

  // Four broad strokes, each with its own start and length.
  FRONT.strokes.forEach((s, i) => {
    const key = `s${i}` as keyof typeof strokes;
    t.fromTo(
      strokes,
      { [key]: 0 },
      { [key]: 1, duration: vary(s.dur, seed, `stroke-${i}`), ease: 'brush', onUpdate: sync, immediateRender: true },
      vary(s.at, seed, `stroke-at-${i}`),
    );
  });

  // The field develops, centre first (the shader does the unevenness).
  t.fromTo(
    field.state,
    { exposure: 0 },
    { exposure: 1, duration: vary(FRONT.develop, seed, 'develop'), ease: 'develop', onUpdate: redraw },
    FRONT.developAt,
  );

  layers.forEach((layer, i) => {
    const lag = i * FRONT.subtitleLag;
    // Brushed over, the letters take the sensitiser's colour…
    t.fromTo(layer.copy, { opacity: 0 }, { opacity: 1, duration: FRONT.sensitisedFor, ease: 'brush' }, FRONT.sensitisedFrom + lag);
    // …and wash white as the blue develops round them.
    const chars = layer.paper.chars;
    const delays = washDelays(chars);
    let last = 0;
    chars.forEach((ch, j) => {
      const at = FRONT.washAt + lag + delays[j];
      const dur = vary(FRONT.wash, seed, `wash-dur-${i}-${j}`);
      t.fromTo(ch, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'develop' }, at);
      last = Math.max(last, at + dur);
    });
    t.set(layer.copy, { opacity: 0 }, last);
  });

  if (pin) t.add(setPress(pin, { scale: 1, opacity: 1, startAt: { scale: PIN_DROP, opacity: 0, y: 0 } }), FRONT.pinAt);

  const imprint = root.querySelector('.frontispiece__imprint');
  const hint = root.querySelector('.frontispiece__hint');
  t.fromTo(imprint, { opacity: 0 }, { opacity: 1, duration: FRONT.print, ease: 'press' }, FRONT.imprintAt);
  t.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: FRONT.print, ease: 'press' }, FRONT.hintAt);

  tl = t;
  return t;
}
