// Smooth scroll: Lenis driven by the GSAP ticker and synced to ScrollTrigger.
// Touch stays native; reduced motion skips Lenis entirely.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { DUR, live } from './eases';
import { onReducedChange, prefersReduced } from './reduced-motion';

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

export function initScroll(): void {
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.ticker.lagSmoothing(0);
  if (!prefersReduced()) start();
  onReducedChange((reduced) => (reduced ? stop() : start()));
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Scroll to an element or position; Lenis when it runs, an instant jump otherwise. */
export function scrollToTarget(target: HTMLElement | number, duration: number = DUR.scrollTo): void {
  if (lenis) {
    lenis.scrollTo(target, { duration, easing: gsap.parseEase('develop') });
    return;
  }
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, y);
}
