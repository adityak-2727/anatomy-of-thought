// The layout conditions every plate animates under (DESIGN-PLAN §3), for gsap.matchMedia().

const MOTION = '(prefers-reduced-motion: no-preference)';

/** Two columns, the whole plate frame pins. */
export const WIDE = `(min-width: 1100px) and (min-height: 700px) and ${MOTION}`;

/** One column (folio and phone): only the figure pins. */
export const COMPACT = `(max-width: 1099px) and ${MOTION}, (max-height: 699px) and ${MOTION}`;

/** Everything shown developed; no pins, no scrubbing. */
export const REDUCED = '(prefers-reduced-motion: reduce)';

/** Phones take pinned sections at about 60% of their desktop length. */
export function isPhone(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}
