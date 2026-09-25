// Seeded randomness. Everything hand-made (jitter, torn edges, brush strokes)
// draws from here, so each visit and each screenshot is identical.

import { fnv1a32 } from '../lib/hash';

export type Rng = () => number;

/** mulberry32: small, fast, good enough for visual jitter. Returns [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stream of numbers for one named thing under one seed. */
export function rngFor(seed: number, key: string | number): Rng {
  return mulberry32(fnv1a32(`${seed}:${key}`));
}

/** A single stable number in [0, 1) for one named thing. */
export function rand(seed: number, key: string | number): number {
  return rngFor(seed, key)();
}

/** A stable number in [-1, 1). */
export function signed(seed: number, key: string | number): number {
  return rand(seed, key) * 2 - 1;
}
