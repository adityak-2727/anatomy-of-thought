// Small helpers for the verbs that need more than an ease.

import { gsap } from 'gsap';
import { DUR, pen } from './eases';

/**
 * set: fast in, dead stop, then a recoil of exactly 1px whatever the distance.
 * Returns a timeline so it can sit inside a larger, time-based sequence.
 */
export function setPress(target: gsap.TweenTarget, vars: gsap.TweenVars, recoilAxis: 'x' | 'y' = 'y'): gsap.core.Timeline {
  const tl = gsap.timeline();
  tl.to(target, { duration: DUR.press, ease: 'press', ...vars });
  tl.to(target, { [recoilAxis]: `-=1`, duration: DUR.recoilUp, ease: 'power1.out' });
  tl.to(target, { [recoilAxis]: `+=1`, duration: DUR.recoilDown, ease: 'power1.in' });
  return tl;
}

/**
 * The same press inside a scrubbed timeline, where units are scroll rather than seconds:
 * the recoil keeps its proportion to the press.
 */
export function pressInto(
  tl: gsap.core.Timeline,
  target: gsap.TweenTarget,
  from: gsap.TweenVars,
  to: gsap.TweenVars,
  at: number,
  duration: number,
): void {
  const k = duration / DUR.press;
  tl.fromTo(target, { ...from, y: 0 }, { ...to, duration, ease: 'press' }, at);
  tl.to(target, { y: -1, duration: DUR.recoilUp * k, ease: 'power1.out' }, at + duration);
  tl.to(target, { y: 0, duration: DUR.recoilDown * k, ease: 'power1.in' }, at + duration + DUR.recoilUp * k);
}

/** The length of an SVG geometry element, for pen-speed timing. */
export function lengthOf(el: SVGGeometryElement): number {
  return el.getTotalLength();
}

/** Duration for drawing a path at pen speed. */
export function penFor(el: SVGGeometryElement): number {
  return pen(lengthOf(el));
}
