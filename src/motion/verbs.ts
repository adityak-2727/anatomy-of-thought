// Small helpers for the verbs that need more than an ease.

import { gsap } from 'gsap';
import { DUR, pen } from './eases';

/**
 * set: fast in, dead stop, then a recoil of exactly 1px whatever the distance.
 * Returns a timeline so it can sit inside a larger sequence.
 */
export function setPress(target: gsap.TweenTarget, vars: gsap.TweenVars, recoilAxis: 'x' | 'y' = 'y'): gsap.core.Timeline {
  const tl = gsap.timeline();
  tl.to(target, { duration: DUR.press, ease: 'press', ...vars });
  tl.to(target, { [recoilAxis]: `-=1`, duration: DUR.recoilUp, ease: 'power1.out' });
  tl.to(target, { [recoilAxis]: `+=1`, duration: DUR.recoilDown, ease: 'power1.in' });
  return tl;
}

/** The length of an SVG geometry element, for pen-speed timing. */
export function lengthOf(el: SVGGeometryElement): number {
  return el.getTotalLength();
}

/** Duration for drawing a path at pen speed. */
export function penFor(el: SVGGeometryElement): number {
  return pen(lengthOf(el));
}
