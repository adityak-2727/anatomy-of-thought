// Smooth scroll: Lenis driven by the GSAP ticker and synced to ScrollTrigger.
// Touch stays native; reduced motion skips Lenis entirely.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { DUR, SCRUB, live } from './eases';
import { onReducedChange, prefersReduced } from './reduced-motion';
import { flags } from '../flags';

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

/**
 * Keep the reader's place when the window changes size or a phone is turned. Pins change
 * length with the screen, so the same scroll position would land somewhere else (turning a
 * phone at Plate III and back left the reader in Plate II). As the size changes, before
 * anything is re-measured, note which part of the atlas crosses the middle of the screen
 * and how far through it the reader is; once the re-measuring has settled, return to that
 * point. A phone's toolbar changes only the height and re-measures nothing, so it is ignored.
 *
 * The timers are the browser's, not GSAP's: the re-measures run inside the plates'
 * gsap.matchMedia builds, and a GSAP timer made there would belong to that build and be
 * killed when it is taken down.
 */
export function keepPlaceOnResize(parts: HTMLElement[]): void {
  // Measured last among the triggers, after every pin above them.
  const marks = parts.map((part) => ScrollTrigger.create({ trigger: part, start: 'top center', end: 'bottom center', refreshPriority: -1 }));
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const settle = DUR.keepPlace * 1000;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let place: { mark: ScrollTrigger; progress: number } | null = null;
  let timer = 0;

  const target = () => (place ? place.mark.start + place.progress * (place.mark.end - place.mark.start) : window.scrollY);
  const restore = () => {
    // Lenis measures the page on its own schedule; it must see the new height first.
    lenis?.resize();
    jumpToY(target());
  };
  // Wait for a quiet moment after the last re-measure, return, look once more (the page
  // may still have been moving), and then forget the place.
  const later = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      restore();
      timer = window.setTimeout(() => {
        if (Math.abs(window.scrollY - target()) > window.innerHeight / 4) restore();
        place = null;
      }, settle);
    }, settle / 4);
  };

  window.addEventListener('resize', () => {
    const turned = window.innerWidth !== width || (!touch && window.innerHeight !== height);
    width = window.innerWidth;
    height = window.innerHeight;
    if (!turned) return;
    if (!place) {
      // The marks still hold their last reading, taken on the old layout. In a gap between
      // parts, the last part passed carries the place (its progress runs on past 1).
      const y = window.scrollY;
      const mark = [...marks].reverse().find((m) => m.start <= y);
      if (!mark) return;
      place = { mark, progress: (y - mark.start) / Math.max(1, mark.end - mark.start) };
    }
    later();
  });

  // The moment the reader moves the page, the place is theirs again: nothing pulls them back.
  const letGo = () => {
    place = null;
    window.clearTimeout(timer);
  };
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.addEventListener(type, letGo, { passive: true });

  // Return at once after each re-measure, too, so the reader is not left elsewhere meanwhile.
  ScrollTrigger.addEventListener('refresh', () => {
    if (!place) return;
    restore();
    later();
  });
}
