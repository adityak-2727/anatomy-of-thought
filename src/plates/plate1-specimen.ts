// Plate I. The specimen: the riddle set large on a paper slip, pinned at both ends.
// As the plate rises the field is brushed on, the slip is laid and its pins pressed in.
// Held still, the field exposes around it, so the sentence becomes a white silhouette.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, createField, type FieldHandle } from '../gl/background';
import { pinSlipEnds, refitSlipEnds } from '../components/piece';
import { PINS, PIN_DROP, PLATE1, SEEDS } from '../motion/eases';
import { COMPACT, REDUCED, WIDE, isPhone } from '../motion/media';
import { scrubFor } from '../motion/scroll';
import { developOnArrival, pressInto } from '../motion/verbs';
import { initLoupe } from '../components/loupe';
import { DISPLAY, SENTENCE } from '../data/specimen';

gsap.registerPlugin(ScrollTrigger);

const span = (r: readonly [number, number]) => r[1] - r[0];

let mm: gsap.MatchMedia | null = null;
let held: ScrollTrigger | null = null;
let resizer: ResizeObserver | null = null;

export function init(root: HTMLElement): void {
  const frame = root.querySelector<HTMLElement>('.plate__frame')!;
  const pinned = root.querySelector<HTMLElement>('.plate__pinned')!;
  const fieldEl = root.querySelector<HTMLElement>('.plate__field')!;
  const wrap = root.querySelector<HTMLElement>('.specimen-slip')!;
  const slip = wrap.querySelector<HTMLElement>('.slip')!;
  const intro = root.querySelector<HTMLElement>('.plate__intro');
  const note = root.querySelector<HTMLElement>('.plate__note');
  const caption = root.querySelector<HTMLElement>('.plate__caption');
  const seed = SEEDS.plates[0];

  const f: FieldHandle = createField(fieldEl, { seed, angle: -3, strokes: 3, overshoot: 14, bias: 0.6 });
  writeMachine(fieldEl.querySelector<HTMLElement>('.machine'));
  initLoupe(fieldEl);
  const pins = pinSlipEnds(wrap, slip, seed);
  resizer = new ResizeObserver(() => refitSlipEnds(slip, pins));
  resizer.observe(slip);

  // The field is brushed and exposed once and stays so: what the machine has
  // processed stays processed, even if the reader scrolls back.
  const proxy = { brush: 0, exposure: 0 };
  const latch = () => advanceField(f, proxy);

  mm = gsap.matchMedia();
  mm.add({ wide: WIDE, compact: COMPACT, reduced: REDUCED }, (context) => {
    const { wide, reduced } = context.conditions as Record<string, boolean>;
    if (reduced) {
      proxy.brush = 1;
      proxy.exposure = 1;
      latch();
      return;
    }

    // Wide screens pin the whole plate; one-column layouts pin the figure alone.
    const pinEl = wide ? frame : pinned;
    const length = isPhone() ? PINS[1][1] : PINS[1][0];
    const k = length / PINS[1][0];
    const scrub = scrubFor('story');
    const a = PLATE1.approach;
    const p = PLATE1.pin;

    const approach = gsap.timeline({
      scrollTrigger: { trigger: pinEl, start: 'top bottom', end: wide ? 'top top' : 'center center', scrub },
    });
    approach.fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch }, a.brush[0]);
    if (wide && intro) developOnArrival(intro, scrub);
    // The slip is laid: it falls a little and turns to rest (its resting turn is in CSS).
    approach.fromTo(
      wrap,
      { y: -PLATE1.slipLift, rotation: PLATE1.slipTurnExtra },
      { y: 0, rotation: 0, duration: span(a.lay), ease: 'settle' },
      a.lay[0],
    );
    pins.forEach((pin, i) =>
      pressInto(approach, pin, { scale: PIN_DROP, opacity: 0 }, { scale: 1, opacity: 1 }, a.pins[0] + i * PLATE1.pinGap, PLATE1.pinPress),
    );
    approach.set({}, {}, 1);

    const hold = gsap.timeline({
      scrollTrigger: {
        trigger: pinEl,
        start: wide ? 'top top' : 'center center',
        end: `+=${length}%`,
        pin: pinEl,
        scrub,
        anticipatePin: 1,
      },
    });
    held = hold.scrollTrigger ?? null;
    hold.fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(p.exposure) * k, ease: 'develop', onUpdate: latch }, p.exposure[0] * k);
    // On wide screens the note and caption arrive with the exposure. In one column the
    // reader meets the text before and after the figure, so it is simply printed.
    if (wide && note) hold.fromTo(note, { opacity: 0 }, { opacity: 1, duration: span(p.note), ease: 'develop' }, p.note[0]);
    if (wide && caption) hold.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: span(p.caption), ease: 'develop' }, p.caption[0]);
    hold.set({}, {}, length);

    return () => {
      held = null;
    };
  });
}

/**
 * The machine's view: the same sentence, set in the same type at the same width and turn,
 * so its lines break exactly where the slip's do; but each letter is replaced by the
 * number the machine receives for it (the apostrophes are the straight ones it is given).
 *
 * Each word is kept whole and each of its letters is its own inline block: a plain inline
 * letter that ended a line was given an empty second fragment at the start of the next,
 * and its number was centred between the two, across the line. The spaces stay real
 * spaces, so they hang at the ends of lines as the slip's do; each space's number is
 * printed by the word before it. The numbers alternate high and low along the sentence.
 */
function writeMachine(machine: HTMLElement | null): void {
  if (!machine) return;
  const wrap = document.createElement('div');
  wrap.className = 'machine__specimen';
  const text = document.createElement('p');
  text.className = 'slip--specimen machine__letters';
  const shown = DISPLAY.big;
  let word: HTMLElement | null = null;
  for (let i = 0; i < shown.length; i++) {
    const code = String(SENTENCE.big.charCodeAt(i));
    const low = i % 2 === 1;
    if (shown[i] === ' ') {
      if (word) {
        word.dataset.space = code;
        word.classList.toggle('is-space-low', low);
      }
      text.append(' ');
      word = null;
      continue;
    }
    if (!word) {
      word = document.createElement('span');
      word.className = 'machine__word';
      text.append(word);
    }
    const char = document.createElement('span');
    char.className = 'machine__char';
    char.classList.toggle('is-low', low);
    char.dataset.code = code;
    char.textContent = shown[i];
    word.append(char);
  }
  wrap.append(text);
  machine.replaceChildren(wrap);
}

export function destroy(): void {
  mm?.revert();
  resizer?.disconnect();
  mm = null;
}

export function range(): { start: number; end: number } | null {
  return held ? { start: held.start, end: held.end } : null;
}
