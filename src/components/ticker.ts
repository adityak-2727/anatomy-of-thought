// Ticker strips: the machine's numbers on narrow paper tape, torn at both ends,
// feeding out from under the piece they belong to.

import { gsap } from 'gsap';
import { DUR, vary } from '../motion/eases';
import { signed } from '../motion/random';
import { tornClip } from './marks';

const MAX_TURN = 0.5; // degrees (BRIEF §7)

export function createTicker(value: string, seed: number): HTMLElement {
  const holder = document.createElement('span');
  holder.className = 'ticker-holder';
  holder.style.setProperty('--ticker-turn', `${(signed(seed, 'ticker-turn') * MAX_TURN).toFixed(2)}deg`);
  const strip = document.createElement('span');
  strip.className = 'ticker';
  strip.style.setProperty('--torn', tornClip(seed));
  strip.textContent = value;
  holder.append(strip);
  return holder;
}

/** Hide the strip up under its piece, ready to feed out. */
export function tuckTicker(holder: HTMLElement): void {
  gsap.set(holder.firstElementChild, { yPercent: -102 });
}

/** Feed the strip out with `press`: fast in, dead stop, a 1px recoil. */
export function feedOut(holder: HTMLElement, seed: number): gsap.core.Timeline {
  const strip = holder.firstElementChild!;
  const tl = gsap.timeline();
  tl.fromTo(strip, { yPercent: -102, y: 0 }, { yPercent: 0, duration: vary(DUR.ticker, seed, 'feed'), ease: 'press' });
  tl.to(strip, { y: -1, duration: DUR.recoilUp, ease: 'power1.out' });
  tl.to(strip, { y: 0, duration: DUR.recoilDown, ease: 'power1.in' });
  return tl;
}
