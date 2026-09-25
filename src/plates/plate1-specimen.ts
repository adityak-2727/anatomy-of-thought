// Plate I. The specimen: the riddle set large on a paper slip, pinned at both ends.
// As the plate rises the field is brushed on, the slip is laid and its pins pressed in.
// Held still, the field exposes around it, so the sentence becomes a white silhouette.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createField, type FieldHandle } from '../gl/background';
import { pinSlipEnds, refitSlipEnds } from '../components/piece';
import { PINS, PIN_DROP, PLATE1, SEEDS } from '../motion/eases';
import { COMPACT, REDUCED, WIDE, isPhone } from '../motion/media';
import { scrubFor } from '../motion/scroll';
import { pressInto } from '../motion/verbs';

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
  const pins = pinSlipEnds(wrap, slip, seed);
  resizer = new ResizeObserver(() => refitSlipEnds(slip, pins));
  resizer.observe(slip);

  // The field is brushed and exposed once and stays so: what the machine has
  // processed stays processed, even if the reader scrolls back.
  const proxy = { brush: 0, exposure: 0 };
  const latch = () => {
    f.state.brush = Math.max(f.state.brush, proxy.brush);
    f.state.exposure = Math.max(f.state.exposure, proxy.exposure);
    f.invalidate();
  };

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
    if (wide && intro) approach.fromTo(intro, { opacity: 0 }, { opacity: 1, duration: span(a.intro), ease: 'develop' }, a.intro[0]);
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

export function destroy(): void {
  mm?.revert();
  resizer?.disconnect();
  mm = null;
}

export function range(): { start: number; end: number } | null {
  return held ? { start: held.start, end: held.end } : null;
}
