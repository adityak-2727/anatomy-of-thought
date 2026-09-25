// Proof III: a sample plate. "Brush and expose" brushes the sensitiser on in strokes,
// then develops it from yellow-green to Prussian blue, centre first; the intro, note
// and caption arrive with the exposure. Time-based, because it answers a button.

import { gsap } from 'gsap';
import { createField, type FieldHandle } from '../gl/background';
import { pinMark } from '../components/marks';
import { DUR, SEEDS } from '../motion/eases';
import { prefersReduced } from '../motion/reduced-motion';

export interface SamplePlate {
  field: FieldHandle;
  /** Jump the printing to a point, 0 to 1 (used by the screenshot script). */
  seek(progress: number): void;
}

export function initSamplePlate(section: HTMLElement): SamplePlate {
  const fieldEl = section.querySelector<HTMLElement>('.sample-field')!;
  const slipWrap = section.querySelector<HTMLElement>('.specimen-slip')!;
  const slip = slipWrap.querySelector<HTMLElement>('.slip')!;
  const status = section.querySelector<HTMLElement>('.proof-status')!;
  const texts = section.querySelectorAll<HTMLElement>('[data-develop]');
  const seed = SEEDS.plates[0];
  const field = createField(fieldEl, { seed, angle: -3, strokes: 3, overshoot: 14, bias: 0.6 });

  // Pinned at both ends. The pins go in once the slip has its final size.
  const pins = () => {
    slipWrap.querySelectorAll('.pin').forEach((p) => p.remove());
    const w = slip.offsetWidth;
    const h = slip.offsetHeight;
    const inset = { x: 18, y: 16 };
    const left = pinMark(seed + 1, { x: -inset.x, y: -inset.y, w, h }, -150);
    const right = pinMark(seed + 2, { x: -(w - inset.x), y: -inset.y, w, h }, -30);
    left.style.left = `${inset.x}px`;
    left.style.top = `${inset.y}px`;
    right.style.left = `${w - inset.x}px`;
    right.style.top = `${inset.y}px`;
    slipWrap.append(left, right);
  };
  pins();
  new ResizeObserver(pins).observe(slip);

  const state = field.state;
  const redraw = () => field.invalidate();
  const print = gsap.timeline({ paused: true, onComplete: () => (status.textContent = 'Exposed.') });
  print.fromTo(state, { brush: 0 }, { brush: 1, duration: DUR.brush, ease: 'brush', onUpdate: redraw }, 0);
  print.fromTo(state, { exposure: 0 }, { exposure: 1, duration: DUR.develop, ease: 'develop', onUpdate: redraw }, DUR.brush * 0.78);
  print.fromTo(
    texts,
    { opacity: 0 },
    { opacity: 1, duration: DUR.develop * 0.7, ease: 'develop', stagger: DUR.develop * 0.18 },
    DUR.brush * 0.9,
  );

  const seek = (progress: number) => {
    print.progress(progress).pause();
    redraw();
    status.textContent = progress >= 1 ? 'Exposed.' : '';
  };

  if (prefersReduced()) {
    seek(1);
    status.textContent = '';
  } else {
    seek(0);
  }

  section.querySelector('[data-action="print"]')!.addEventListener('click', () => {
    status.textContent = '';
    if (prefersReduced()) {
      gsap.fromTo(section.querySelectorAll('.plate__figure .field, [data-develop]'), { opacity: 0 }, { opacity: 1, duration: DUR.crossfade });
      seek(1);
      return;
    }
    print.restart();
  });

  section.querySelector('[data-action="clear"]')!.addEventListener('click', () => {
    print.pause();
    const done = () => {
      seek(0);
      status.textContent = 'Cleared.';
    };
    gsap.to(state, { brush: 0, exposure: 0, duration: DUR.crossfade, onUpdate: redraw });
    gsap.to(texts, { opacity: 0, duration: DUR.crossfade, onComplete: done });
  });

  return { field, seek };
}
