// The layout conditions every plate animates under (DESIGN-PLAN §3), for gsap.matchMedia().

const MOTION = '(prefers-reduced-motion: no-preference)';

/**
 * A screen tall enough to hold a pinned figure. Below it (a phone on its side, the
 * smallest phones) a pin would hide part of its own figure, so the plates are shown
 * developed and still, as they are under reduced motion (Phase 8).
 */
const ROOM = '(min-height: 600px)';

/** Two columns, the whole plate frame pins. */
export const WIDE = `(min-width: 1100px) and (min-height: 700px) and ${MOTION}`;

/** One column (folio and phone): only the figure pins. */
export const COMPACT = `(max-width: 1099px) and ${ROOM} and ${MOTION}, (max-height: 699px) and ${ROOM} and ${MOTION}`;

/** Any layout, so long as motion is welcome. */
export const MOTION_ONLY = MOTION;

/** Motion is unwelcome: for the reader's own sentence, which never pins. */
export const REDUCED = '(prefers-reduced-motion: reduce)';

/** Every plate shown developed; no pins, no scrubbing: reduced motion, or no room to pin. */
export const STILL = `${REDUCED}, (max-height: 599px)`;

/** Phones take pinned sections at about 60% of their desktop length. */
export function isPhone(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}
