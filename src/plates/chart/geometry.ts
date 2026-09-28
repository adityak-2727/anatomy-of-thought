// What both drawings of the chart share (three.js and the SVG fallback): when each star
// comes up, the constellation lines as laid threads with the time the pen reaches each
// point. Worked out once, from seeds, so both drawings agree.

import { CONSTELLATIONS } from '../../data/vocab';
import { LINES, STARS, starFor } from '../../data/chart';
import { rand, rngFor, signed } from '../../motion/random';
import type { Vec3 } from '../../lib/projection';

/** Segments per constellation line: enough for the thread's wobble to read. */
export const LINE_STEPS = 8;
/** How far a line wanders from straight, in chart units. */
const WOBBLE = 0.15;
/** Constellations start their lines at slightly different moments, as a hand would. */
const LINE_LEAD = 0.18;
/** A star that answers to a piece of the specimen comes up with that piece, never before. */
export const NEVER = 2;

export interface Polyline {
  constellation: number;
  points: Vec3[];
  /** 0–1: when the pen reaches each point, across the whole drawing of the lines. */
  times: number[];
}

/** The stars the specimen's pieces hand off to, one per distinct piece. */
export function specimenStars(pieces: readonly string[]): number[] {
  return [...new Set(pieces.map(starFor).filter((i) => i >= 0))];
}

/** When each star develops, as a share of the reveal; the specimen's stars wait for their pieces. */
export function thresholds(seed: number, own: readonly number[]): Float32Array {
  const out = new Float32Array(STARS.length);
  STARS.forEach((s, i) => {
    // Uneven, but bright stars tend to come up a little sooner.
    out[i] = rand(seed, `star-${i}`) * 0.78 + ((s.mag - 1) / 5) * 0.14;
  });
  for (const i of own) out[i] = NEVER;
  return out;
}

const CONSTELLATION_INDEX = new Map(CONSTELLATIONS.map((c, i) => [c.id, i]));

/** Each line as a laid thread: subdivided, with a gentle seeded wobble, and pen times. */
export function constellationLines(seed: number): Polyline[] {
  const byConstellation = new Map<number, [number, number][]>();
  for (const line of LINES) {
    const c = CONSTELLATION_INDEX.get(STARS[line[0]].constellation)!;
    if (!byConstellation.has(c)) byConstellation.set(c, []);
    byConstellation.get(c)!.push(line);
  }
  const length = ([a, b]: [number, number]) => Math.hypot(...([0, 1, 2] as const).map((k) => STARS[a].p[k] - STARS[b].p[k]));
  const totals = [...byConstellation.values()].map((lines) => lines.reduce((sum, l) => sum + length(l), 0));
  const longest = Math.max(...totals);

  const out: Polyline[] = [];
  for (const [c, lines] of byConstellation) {
    const start = rand(seed, `lead-${c}`) * LINE_LEAD;
    const pace = (1 - LINE_LEAD) / longest;
    let travelled = 0;
    lines.forEach(([a, b], n) => {
      const from = STARS[a].p;
      const to = STARS[b].p;
      const len = length([a, b]);
      const dir = [0, 1, 2].map((k) => (to[k] - from[k]) / (len || 1));
      // Across the line, in the chart's plane.
      const across = [-dir[1], dir[0], 0];
      const l = Math.hypot(across[0], across[1]) || 1;
      const r = rngFor(seed, `thread-${c}-${n}`);
      const phase = r() * Math.PI * 2;
      const turns = 0.8 + r() * 0.9;
      const amp = WOBBLE * (0.6 + r() * 0.8);
      const points: Vec3[] = [];
      const times: number[] = [];
      for (let i = 0; i <= LINE_STEPS; i++) {
        const t = i / LINE_STEPS;
        const wobble = Math.sin(Math.PI * t) * Math.sin(phase + t * Math.PI * 2 * turns) * amp;
        points.push([0, 1, 2].map((k) => from[k] + (to[k] - from[k]) * t + (across[k] / l) * wobble) as unknown as Vec3);
        times.push(start + (travelled + len * t) * pace);
      }
      travelled += len;
      out.push({ constellation: c, points, times });
    });
  }
  return out;
}

/** A small, stable turn for each star's rays, so no two symbols are stamped identically. */
export function rayTurn(seed: number, i: number): number {
  return signed(seed, `rays-${i}`) * 0.2;
}
