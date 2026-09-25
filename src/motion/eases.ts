// The atlas's motion tokens: six eases, the durations, pen speed and scroll lengths.
// No other file defines a timing. Paths are editable live under ?debug.

import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { signed } from './random';

gsap.registerPlugin(CustomEase);

export const EASE_PATHS = {
  // Quick start, a long wet drag at the end.
  brush: 'M0,0 C0.05,0.42 0.14,0.74 0.34,0.88 0.54,0.97 0.74,0.995 1,1',
  // Slow start, gathering, long settle.
  develop: 'M0,0 C0.18,0 0.28,0.04 0.38,0.16 0.48,0.28 0.56,0.62 0.68,0.84 0.75,0.968 0.87,1 1,1',
  // A pen stroke that hesitates a little near the middle.
  hand: 'M0,0 C0.1,0.14 0.26,0.38 0.42,0.48 0.5,0.53 0.56,0.55 0.62,0.6 0.7,0.667 0.86,0.98 1,1',
  // power3.out with a 1.5% overshoot.
  settle: 'M0,0 C0.14,0.62 0.28,1.015 0.5,1.015 0.7,1.015 0.84,1 1,1',
  // Fast in, dead stop. The 1px recoil is added separately (see verbs.ts).
  press: 'M0,0 C0.3,0 0.62,0.5 1,1',
  // Very slow in and out, like a toning bath.
  tone: 'M0,0 C0.62,0 0.38,1 1,1',
} as const;

export type EaseName = keyof typeof EASE_PATHS;
export const EASE_NAMES = Object.keys(EASE_PATHS) as EaseName[];

const current: Record<EaseName, string> = { ...EASE_PATHS };

export function defineEase(name: EaseName, path: string): void {
  current[name] = path;
  CustomEase.create(name, path);
  window.dispatchEvent(new CustomEvent('atlas:ease', { detail: { name } }));
}

export function easePath(name: EaseName): string {
  return current[name];
}

for (const name of EASE_NAMES) CustomEase.create(name, EASE_PATHS[name]);

/** What each ease is for, in the atlas's words (shown on the proof sheet). */
export const EASE_JOBS: Record<EaseName, string> = {
  brush: 'Sensitiser brushed on: quick start, a long wet drag.',
  develop: 'Exposure and development: slow start, gathering, long settle.',
  hand: 'Cut lines and threads: a pen stroke with a hesitation near the middle.',
  settle: 'Pinned pieces: arrives, overshoots a hair, rests.',
  press: 'Type sorts and ticker strips: fast in, dead stop, a 1px recoil.',
  tone: 'The toning bath: very slow in and out.',
};

// Durations, in seconds (BRIEF §5).
export const DUR = {
  respondFast: 0.12,
  respond: 0.16,
  respondSlow: 0.22,
  crossfade: 0.15,          // also the reduced-motion ceiling
  recoilUp: 0.05,
  recoilDown: 0.07,
  press: 0.32,
  settle: 0.7,
  stroke: 0.42,             // one brush stroke
  brush: 1.1,               // a whole field brushed
  develop: 1.8,             // a field exposed, time-based
  tone: 3.2,
  ticker: 0.38,             // 300–450ms with variation
  move: 0.6,
  travel: [1.2, 1.6],       // list of plates to a plate: 1.2s near, up to 1.6s far
  travelPerScreen: 0.04,    // seconds added per screen of distance
} as const;

/** Values that ?debug may change at runtime. */
export const live = {
  penSpeed: 900,              // px per second: lines draw at a constant pen speed
  lenisLerp: 0.1,
  loupeLerp: 0.2,
};

const PEN_FLOOR = 0.12;       // a short cut must still be seen being drawn
const PEN_CEILING = 1.6;

export function pen(lengthPx: number): number {
  return gsap.utils.clamp(PEN_FLOOR, PEN_CEILING, lengthPx / live.penSpeed);
}

/** How long to wait for fonts before showing the page anyway (BRIEF §6). */
export const FONT_WAIT_MS = 1500;

/** Hand-made timing: a stable ±amount variation of a base duration. */
export const VARY = 0.12;
export function vary(base: number, seed: number, key: string | number, amount = VARY): number {
  return base * (1 + signed(seed, key) * amount);
}

/** A stagger step with ±25% seeded jitter, returned as a per-index offset function. */
export function jitterStagger(step: number, seed: number, key: string) {
  return (i: number) => i * step + signed(seed, `${key}:${i}`) * step * 0.25;
}

// Scroll.
export const SCRUB = { story: 0.7, camera: 1.0, needle: 0.6 } as const;

/** Pin lengths in vh, desktop and phone (DESIGN-PLAN §2.4). */
export const PINS = {
  1: [150, 90],
  2: [250, 150],
  3: [350, 210],
  4: [300, 180],
  5: [150, 90],
  6: [250, 150],
} as const;

// ─── Storyboards ────────────────────────────────────────────────────────────
// Every sequence's timing lives here, so no module holds a timing of its own.
// Time-based values are seconds; scrubbed values are fractions or vh, as noted.

/** The frontispiece: the site's one untriggered moment, about three seconds. Seconds. */
export const FRONT = {
  // Four broad strokes, each with its own start and length: a hand, not a machine.
  strokes: [
    { at: 0, dur: 0.42 },
    { at: 0.22, dur: 0.38 },
    { at: 0.47, dur: 0.46 },
    { at: 0.7, dur: 0.35 },
  ],
  developAt: 0.85,
  develop: 1.7,
  // The letters lie under the sensitiser, so they hold its yellow-green once brushed over
  // (only once the strokes have crossed them, so no pale letters show on bare paper)…
  sensitisedFrom: 0.8,
  sensitisedFor: 0.3,
  // …and wash to white as the blue develops around them, from the centre out.
  washAt: 1.55,
  wash: 0.55,
  washSpread: 0.5,
  washJitter: 0.08,
  subtitleLag: 0.25,
  pinAt: 2.1,
  imprintAt: 2.3,
  hintAt: 2.62,
  print: 0.24,
} as const;

/** The list of plates: leader dots darken left to right on hover. Seconds. */
export const LIST = {
  dot: 0.12,
  dotStagger: 0.008,
  undo: 0.12,
} as const;

/**
 * Plate I. Approach values are fractions of the approach (the plate rising from the
 * bottom of the screen to the top); pin values are vh of scroll within the pin.
 */
export const PLATE1 = {
  approach: {
    brush: [0, 0.55],
    intro: [0.1, 0.6],
    lay: [0.4, 1],
    pins: [0.7, 1],
  },
  pin: {
    exposure: [0, 60],
    note: [30, 55],
    caption: [45, 65],
  },
  slipLift: 14,        // px the slip falls as it is laid
  slipTurnExtra: -0.8, // degrees beyond its resting turn (in tokens.css) as it falls
  pinPress: 0.12,      // share of the approach one pin takes to press in
  pinGap: 0.08,        // share of the approach between the two pins
} as const;

/** The scale a pin starts from as it is pressed into the paper. */
export const PIN_DROP = 1.6;

/** Every plate brushes differently. Seeds count up from 1843. */
export const SEEDS = {
  frontispiece: 1843,
  plates: [1844, 1845, 1846, 1847, 1848, 1849],
  proof: 1850,
} as const;
