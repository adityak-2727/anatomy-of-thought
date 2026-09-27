// The chart of meaning, laid out (BRIEF §10). Every word in vocab.ts becomes a star with a
// place in three dimensions and a magnitude; each constellation gets a few lines between
// near neighbours; the camera has an overview and five stops.
//
// The words the story names are placed by hand (trophy among medal, cup and prize; big
// beside small). The rest are scattered about their constellation from a fixed seed, so
// the chart is the same on every visit. Positions are illustrative: a drawing, not a model.

import { CONSTELLATIONS, type Constellation } from './vocab';
import { COMMON_WORDS } from './common-words';
import { mulberry32 } from '../motion/random';
import { fnv1a32 } from '../lib/hash';
import { distance as dist, projector, pxPerUnit, type Pose, type Vec3 } from '../lib/projection';

export type { Pose, Vec3 };

/** A narrow lens, for an engraved, nearly flat look with a little depth (DESIGN-PLAN §8.6). */
export const CHART_FOV = 28;

export interface Star {
  text: string;
  constellation: string;
  p: Vec3;
  /** 1 (brightest, commonest) to 6 (faintest), as astronomers count. */
  mag: number;
}

/** Where each constellation sits. The Crowded Centre is, as its name says, near the centre. */
const CENTRES: Record<string, Vec3> = {
  centre: [2.4, -3.1, 1.7],
  laurel: [-58, 32, 8],
  chest: [44, 26, -12],
  wardrobe: [62, -16, 6],
  rule: [-22, -46, 14],
  menagerie: [-86, -22, -28],
  hearth: [12, 64, -34],
  heart: [-36, 68, 24],
  sky: [80, 56, 18],
  clock: [-94, 64, -12],
  road: [90, -58, -20],
  table: [30, -74, -30],
  palette: [-62, -76, -10],
  tally: [-106, 12, 30],
  workshop: [100, 4, 34],
};

/** Offsets from the constellation's centre, for the words the story names. */
const PLACED: Record<string, Record<string, Vec3>> = {
  laurel: { trophy: [0, 0, 0], medal: [5.5, 3, 1.5], cup: [-4.5, 4.2, -1], prize: [3, -5.2, 2], award: [-6, -3, 3] },
  chest: { case: [0, 0, 0], box: [4.8, 3.4, -1], bag: [-5, 2.6, 1.5], trunk: [2.4, -5, 2.5], crate: [-3, -5, -2] },
  wardrobe: { suit: [0, 0, 0], coat: [5, 2.6, 1], shirt: [-4.6, 3.6, -2], jacket: [2.2, -5, 1.5], dress: [-5, -3, 2] },
  rule: {
    big: [-1.5, 0, 0], small: [1.6, 0.4, 0.3], large: [-3.4, 3.4, 1], little: [3.6, 3.2, -0.8],
    up: [-1.2, -6.5, 1], down: [1.3, -6.8, 0.6], tall: [-6, 1, -2], short: [6.2, 0.8, -1.6], fit: [0, 4.8, -3],
  },
  sky: { hot: [-1.4, 0, 0.5], cold: [1.5, 0.4, -0.2], rain: [4, 5, 1], snow: [6, 3.5, -1] },
  centre: {
    it: [0, 0, 0], the: [4, 2.4, 1], The: [5.2, 3.8, 1.6], a: [-3.6, 2.6, -1], of: [-2.4, -3.4, 1.5],
    too: [3, -3.6, -1.2], "'s": [-4.8, -1, 2], "'t": [5.6, -1.2, 2.4], doesn: [7.4, 0.4, -1],
    because: [-6.6, 1.4, -2.6], in: [1.4, 4.8, -2.4], what: [-1, -6.2, -1.8], What: [0.9, -7.6, -0.7],
    '.': [8.6, -3.8, 0.6], '?': [-8.4, -4.4, 1.2], ',': [-7.4, 5.6, 0.4], '!': [9, 4.6, -2],
  },
};

const MIN_GAP = 3.1;
/** The very commonest pieces of all: the brightest stars on the chart. */
const BRIGHTEST = new Set(['the', 'a', 'of', 'to', 'and', 'in', 'is', 'it', 'that', 'for', 'on', 'was', "'s", '.', ',']);
/** The rest of the Crowded Centre, and the everyday words the tokeniser keeps whole. */
const COMMON = new Set([...CONSTELLATIONS.find((c) => c.id === 'centre')!.words.map((w) => w.toLowerCase()), ...COMMON_WORDS]);

/** How bright a word is: common words shine; long words are rarer (Zipf), so fainter. */
export function magnitude(word: string): number {
  const w = word.toLowerCase();
  if (BRIGHTEST.has(w)) return 1;
  if (COMMON.has(w)) return 2;
  if (w.length <= 4) return 3;
  if (w.length <= 6) return 4;
  if (w.length <= 8) return 5;
  return 6;
}

function radiusFor(c: Constellation): number {
  return 7 + c.words.length * 0.33;
}

function place(c: Constellation): Star[] {
  const rng = mulberry32(fnv1a32(`chart:${c.id}`));
  const centre = CENTRES[c.id];
  const fixed = PLACED[c.id] ?? {};
  const radius = radiusFor(c);
  const taken: Vec3[] = Object.values(fixed).map((o): Vec3 => [centre[0] + o[0], centre[1] + o[1], centre[2] + o[2]]);
  const stars: Star[] = [];
  for (const word of c.words) {
    const offset = fixed[word];
    let p: Vec3;
    if (offset) {
      p = [centre[0] + offset[0], centre[1] + offset[1], centre[2] + offset[2]];
    } else {
      // Scatter in a flattened ball, keeping clear of every star already placed.
      let best: Vec3 = centre;
      let bestGap = -1;
      for (let attempt = 0; attempt < 40; attempt++) {
        const u = rng() * 2 - 1;
        const phi = rng() * Math.PI * 2;
        const r = radius * Math.cbrt(rng()) * 0.95;
        const s = Math.sqrt(1 - u * u);
        const q: Vec3 = [centre[0] + r * s * Math.cos(phi), centre[1] + r * s * Math.sin(phi) * 0.8, centre[2] + r * u * 0.6];
        const gap = Math.min(...taken.map((t) => Math.hypot(q[0] - t[0], q[1] - t[1], q[2] - t[2])), Infinity);
        if (gap > bestGap) {
          best = q;
          bestGap = gap;
        }
        if (gap >= MIN_GAP) break;
      }
      p = best;
      taken.push(p);
    }
    stars.push({ text: word, constellation: c.id, p: p.map((v) => Math.round(v * 100) / 100) as unknown as Vec3, mag: magnitude(word) });
  }
  return stars;
}

export const STARS: readonly Star[] = CONSTELLATIONS.flatMap(place);

/**
 * A constellation's figure: the brightest nine of its stars, joined by the shortest
 * lines that link them all (a minimum spanning tree), and one more short line to close
 * a shape. Always between near neighbours, never across constellations.
 */
function linesFor(c: Constellation): [number, number][] {
  const indices = STARS.map((s, i) => (s.constellation === c.id ? i : -1)).filter((i) => i >= 0);
  const centre = CENTRES[c.id];
  const chosen = [...indices]
    .sort((a, b) => STARS[a].mag - STARS[b].mag || dist(STARS[a].p, centre) - dist(STARS[b].p, centre))
    .slice(0, 9);
  const inTree = new Set([chosen[0]]);
  const edges: [number, number][] = [];
  while (inTree.size < chosen.length) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const a of inTree) {
      for (const b of chosen) {
        if (inTree.has(b)) continue;
        const d = dist(STARS[a].p, STARS[b].p);
        if (d < bestD) {
          bestD = d;
          best = [a, b];
        }
      }
    }
    edges.push(best!);
    inTree.add(best![1]);
  }
  let extra: [number, number] | null = null;
  let extraD = Infinity;
  for (const a of chosen) {
    for (const b of chosen) {
      if (a >= b || edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
      const d = dist(STARS[a].p, STARS[b].p);
      if (d < extraD) {
        extraD = d;
        extra = [a, b];
      }
    }
  }
  if (extra) edges.push(extra);
  return edges;
}

export const LINES: readonly [number, number][] = CONSTELLATIONS.flatMap(linesFor);

/** A constellation's centre of gravity, and how far its stars reach from it. */
export function extent(id: string): { centroid: Vec3; radius: number } {
  const own = STARS.filter((s) => s.constellation === id);
  const centroid = [0, 1, 2].map((k) => own.reduce((sum, s) => sum + s.p[k], 0) / own.length) as unknown as Vec3;
  const radius = Math.max(...own.map((s) => dist(s.p, centroid)));
  return { centroid, radius };
}

const bounds = (() => {
  const lo = [0, 1, 2].map((k) => Math.min(...STARS.map((s) => s.p[k])));
  const hi = [0, 1, 2].map((k) => Math.max(...STARS.map((s) => s.p[k])));
  return { lo, hi, centre: [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as unknown as Vec3 };
})();

/** The middle of the chart's bounding box. */
export const CHART_CENTRE: Vec3 = bounds.centre;

/** How far the chart may reach towards the edge of its field, as a share of the half-width. */
const OVERVIEW_FILL = 0.86;

/**
 * Standing back far enough to see the whole chart in a field of this shape, looking
 * slightly down on it. The distance is found by projecting every star and stepping back
 * until the widest one sits inside the frame. `band` px at the foot of the field are
 * kept clear: the camera looks a little lower, so the chart sits above them.
 */
export function overviewFor(width: number, height: number, band = 0): Pose {
  const centre = bounds.centre;
  const room = height - band;
  let back = 300;
  let target: Vec3 = centre;
  const at = (): Pose => ({ position: [target[0], target[1] + back * 0.03, target[2] + back], target });
  for (let i = 0; i < 6; i++) {
    const drop = band / 2 / pxPerUnit({ pose: at(), fov: CHART_FOV, width, height }, back);
    target = [centre[0], centre[1] - drop, centre[2]];
    const project = projector({ pose: at(), fov: CHART_FOV, width, height });
    let reach = 0;
    for (const s of STARS) {
      const p = project(s.p);
      reach = Math.max(reach, Math.abs(p.x / width - 0.5) * 2, Math.abs(p.y - room / 2) / (room / 2));
    }
    back *= reach / OVERVIEW_FILL;
  }
  return at();
}

/** The camera's five stops, in the order the plate visits them (BRIEF §6). */
export const STOP_ORDER = ['laurel', 'chest', 'wardrobe', 'rule', 'centre'] as const;

/** At each stop, the words its caption names are set beside their stars. */
export const STOP_WORDS: Record<(typeof STOP_ORDER)[number], readonly string[]> = {
  laurel: ['trophy', 'medal', 'cup', 'prize'],
  chest: ['case', 'box', 'bag', 'trunk'],
  wardrobe: ['suit', 'coat', 'shirt', 'jacket'],
  rule: ['big', 'small'],
  centre: ['it', 'the', 'too', "'s"],
};

/**
 * How close each stop comes, as a share of the distance that frames the whole
 * constellation. The Crowded Centre is looked at closely, so its small words part.
 */
const CLOSENESS: Record<string, number> = { centre: 0.72 };

/** A pose that frames one constellation, seen from a little to the right and above. */
export function poseFor(id: string): Pose {
  const { centroid, radius } = extent(id);
  const back = (40 + radius * 2.8) * (CLOSENESS[id] ?? 1);
  return { position: [centroid[0] + back * 0.12, centroid[1] + back * 0.08, centroid[2] + back], target: centroid };
}

/** Which star a piece becomes: its exact text if the chart has it, otherwise its lower case. */
export function starFor(piece: string): number {
  const text = piece.replace(/^ /, '');
  const exact = STARS.findIndex((s) => s.text === text);
  if (exact >= 0) return exact;
  return STARS.findIndex((s) => s.text === text.toLowerCase());
}

/** The chart's half-width, in its own units: coordinates are written as shares of it. */
const SPAN = 120;

/**
 * A star's place as the machine would write it: three numbers (a real model writes
 * thousands). The minus sign is a true minus.
 */
export function coordinates(p: Vec3): string[] {
  return [...p].map((v) => (v / SPAN).toFixed(3).replace('-', '−'));
}

const SPOKEN: Record<string, string> = { '.': 'full stop', ',': 'comma', '?': 'question mark', '!': 'exclamation mark' };

/** A piece as it reads in running text: its space dropped, a curly apostrophe, punctuation named. */
export function spokenPiece(piece: string): string {
  const bare = piece.replace(/^ /, '');
  return SPOKEN[bare] ?? bare.replace(/'/g, '’');
}
