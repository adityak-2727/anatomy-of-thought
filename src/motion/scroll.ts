// Smooth scroll: Lenis driven by the GSAP ticker and synced to ScrollTrigger.
// Touch stays native; reduced motion skips Lenis entirely.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { DUR, SCRUB, live } from './eases';
import { onReducedChange, prefersReduced } from './reduced-motion';
import { flags } from '../flags';
import { setPaperOffset } from '../gl/background';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
const tick = (time: number) => lenis?.raf(time * 1000);

function start(): void {
  if (lenis) return;
  lenis = new Lenis({ lerp: live.lenisLerp, syncTouch: false, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
}

function stop(): void {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
}

/**
 * The paper travels with the page, except while a plate is pinned: then the page
 * appears to hold still, so the grain holds still with it.
 */
function paperOffset(): number {
  const y = window.scrollY;
  let held = 0;
  for (const st of ScrollTrigger.getAll()) {
    if (!st.pin) continue;
    held += gsap.utils.clamp(0, st.end - st.start, y - st.start);
  }
  return y - held;
}

export function initScroll(): void {
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.ticker.lagSmoothing(0);
  if (!prefersReduced()) start();
  onReducedChange((reduced) => (reduced ? stop() : start()));
  setPaperOffset(paperOffset);
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Scrub smoothing for a kind of story beat; instant under ?shots so checkpoints are exact. */
export function scrubFor(kind: keyof typeof SCRUB): number | true {
  return flags().shots ? true : SCRUB[kind];
}

/** 1.2s for a short hop, up to 1.6s for the length of the atlas (BRIEF §6). */
export function travelTime(distance: number): number {
  const [min, max] = DUR.travel;
  return gsap.utils.clamp(min, max, min + (Math.abs(distance) / window.innerHeight) * DUR.travelPerScreen);
}

/** Scroll to a position; Lenis when it runs, an instant jump otherwise. */
export function scrollToY(y: number, onArrive?: () => void): void {
  if (lenis) {
    lenis.scrollTo(y, {
      duration: travelTime(y - window.scrollY),
      easing: gsap.parseEase('develop'),
      onComplete: () => onArrive?.(),
    });
    return;
  }
  window.scrollTo(0, y);
  onArrive?.();
}

/** Jump without smoothing (screenshots, reduced motion). */
export function jumpToY(y: number): void {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  ScrollTrigger.update();
}
