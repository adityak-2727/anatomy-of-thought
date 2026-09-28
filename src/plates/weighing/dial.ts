// The temperature dial. The real control is a range input (0 to 2 in steps of 0.05), so
// keyboards and screen readers use it as they would any slider; the drawn dial mirrors
// it, and can also be turned directly, thrown with a little inertia, snapping to a step.
//
// The turn is measured from pointer events against the dial's centre on screen rather
// than by Draggable's rotation mode: inside ScrollTrigger's pin (position: fixed),
// Draggable takes its rotation origin in viewport coordinates and the pointer in page
// coordinates, so a turn of 60° registered as a fraction of a degree. InertiaPlugin still
// carries the throw.

import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { DIAL_SWEEP, dialMark } from '../../components/marks';
import { PLATE5 } from '../../motion/eases';

gsap.registerPlugin(InertiaPlugin);

const MAX = 2;
const STEP = 0.05;
const DEG_PER_STEP = (DIAL_SWEEP * 2 * STEP) / MAX;

const angleOf = (t: number) => -DIAL_SWEEP + (t / MAX) * DIAL_SWEEP * 2;
const tOf = (angle: number) => ((angle + DIAL_SWEEP) / (DIAL_SWEEP * 2)) * MAX;
const snap = (angle: number) => Math.round((angle + DIAL_SWEEP) / DEG_PER_STEP) * DEG_PER_STEP - DIAL_SWEEP;
const clampAngle = (a: number) => Math.min(DIAL_SWEEP, Math.max(-DIAL_SWEEP, a));

export interface Dial {
  destroy(): void;
}

export function initDial(dial: HTMLElement, seed: number, onTemperature: (t: number, animate: boolean) => void, still: () => boolean): Dial {
  const input = dial.querySelector<HTMLInputElement>('.dial__input')!;
  const output = dial.querySelector<HTMLOutputElement>('.dial__value');
  const face = dial.querySelector<HTMLElement>('.dial__face')!;
  const { svg, needle } = dialMark(seed);
  face.replaceChildren(svg);
  const turn = { rotation: angleOf(Number(input.value)) };
  gsap.set(needle, { svgOrigin: '0 0', rotation: turn.rotation });
  InertiaPlugin.track(turn, 'rotation');

  let turning = false;
  const show = (t: number) => {
    if (output) output.textContent = t.toFixed(2);
    input.setAttribute('aria-valuetext', `${t.toFixed(2)}, ${t <= 0.05 ? 'coldest' : t >= 1.95 ? 'hottest' : t < 1 ? 'cool' : t > 1 ? 'warm' : 'neutral'}`);
  };
  show(Number(input.value));

  // The input speaks first: the dial follows it, unless the dial is what moved it.
  input.addEventListener('input', () => {
    const t = Number(input.value);
    show(t);
    if (turning) return;
    gsap.killTweensOf(turn);
    turn.rotation = angleOf(t);
    gsap.to(needle, { rotation: turn.rotation, duration: still() ? 0 : PLATE5.needle, ease: 'settle', overwrite: true });
    onTemperature(t, true);
  });

  /** The dial has turned: the needle follows, and the temperature steps with it. */
  const apply = () => {
    gsap.set(needle, { rotation: turn.rotation });
    const t = Math.round(tOf(turn.rotation) / STEP) * STEP;
    if (Math.abs(Number(input.value) - t) < 1e-9) return;
    input.value = t.toFixed(2);
    show(Number(input.value));
    onTemperature(Number(input.value), false);
  };

  // Clockwise from straight up, in degrees.
  let centre = { x: 0, y: 0 };
  let last = 0;
  const angleAt = (e: PointerEvent) => (Math.atan2(e.clientX - centre.x, centre.y - e.clientY) * 180) / Math.PI;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const box = face.getBoundingClientRect();
    centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    last = angleAt(e);
    turning = true;
    gsap.killTweensOf(turn);
    face.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onMove = (e: PointerEvent) => {
    if (!turning) return;
    const a = angleAt(e);
    // The shortest way round from the last reading, so the dial never jumps across its gap.
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last = a;
    turn.rotation = clampAngle(turn.rotation + d);
    apply();
  };

  const onUp = () => {
    if (!turning) return;
    const done = () => {
      turning = false;
      apply();
    };
    if (still()) {
      turn.rotation = snap(turn.rotation);
      done();
      return;
    }
    gsap.to(turn, {
      // A little inertia: the dial carries on a touch after the hand lets go, then settles on a step.
      inertia: { rotation: { velocity: 'auto', min: -DIAL_SWEEP, max: DIAL_SWEEP, end: snap }, resistance: 900, duration: { min: 0.15, max: 0.6 } },
      onUpdate: apply,
      onComplete: done,
    });
  };

  face.addEventListener('pointerdown', onDown);
  face.addEventListener('pointermove', onMove);
  face.addEventListener('pointerup', onUp);
  face.addEventListener('pointercancel', onUp);

  return {
    destroy() {
      gsap.killTweensOf(turn);
      InertiaPlugin.untrack(turn);
      face.removeEventListener('pointerdown', onDown);
      face.removeEventListener('pointermove', onMove);
      face.removeEventListener('pointerup', onUp);
      face.removeEventListener('pointercancel', onUp);
    },
  };
}
