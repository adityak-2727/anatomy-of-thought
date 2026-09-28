// Where each piece looks while reading (BRIEF §3). Three illustrative readers
// (attention heads), hand-authored row by row for both variants; the default view,
// "All readers", is their mean. Weights are illustrative, not measured.
//
// Rows are written with the brief's piece numbers (1 = The … 20 = ?). A reader's row
// for piece i says how much piece i weighs itself and each piece before it. Reading is
// causal: nothing may point forward, and each row sums to 1 (both asserted here and in
// the tests).
//
// The story lives in the averaged view (DESIGN-PLAN §8.3), so reader one over-states it:
// readers two and three dilute whatever it says.

import type { Variant } from './specimen';

export type Sparse = Readonly<Record<number, number>>;
export type Matrix = readonly (readonly number[])[];

/** Which view the threads show: every reader averaged, or one reader alone. */
export type View = 'all' | 0 | 1 | 2;

export const PIECE_COUNT = 20;

/** Brief numbering, for reading the rows below. */
const THE = 1, TROPHY = 2, DOESN = 3, T = 4, FIT = 5, IN = 6, THE2 = 7, SUIT = 8, CASE = 9, BECAUSE = 10;
const IT = 11, S = 12, TOO = 13, BIG = 14, STOP = 15, WHAT = 16, S2 = 17, TOO2 = 18, BIG2 = 19, ASK = 20;

/**
 * Reader one follows the story: content words reach for related content words; at
 * "it" the weight is spread and uncertain; at "big" it ties "it" to trophy (to suit
 * and case in the variant); the question reaches back to the answer.
 */
const READER_ONE: Record<number, Sparse> = {
  [THE]: { [THE]: 1 },
  [TROPHY]: { [TROPHY]: 0.6, [THE]: 0.4 },
  [DOESN]: { [DOESN]: 0.45, [TROPHY]: 0.4, [THE]: 0.15 },
  [T]: { [T]: 0.3, [DOESN]: 0.6, [TROPHY]: 0.1 },
  [FIT]: { [FIT]: 0.3, [TROPHY]: 0.4, [DOESN]: 0.15, [T]: 0.15 },
  [IN]: { [IN]: 0.35, [FIT]: 0.5, [TROPHY]: 0.15 },
  [THE2]: { [THE2]: 0.4, [IN]: 0.35, [THE]: 0.25 },
  [SUIT]: { [SUIT]: 0.4, [FIT]: 0.25, [THE2]: 0.15, [TROPHY]: 0.2 },
  [CASE]: { [CASE]: 0.25, [SUIT]: 0.55, [FIT]: 0.1, [TROPHY]: 0.1 },
  [BECAUSE]: { [BECAUSE]: 0.25, [FIT]: 0.3, [DOESN]: 0.15, [T]: 0.15, [CASE]: 0.15 },
  [IT]: { [IT]: 0.18, [BECAUSE]: 0.16, [TROPHY]: 0.14, [SUIT]: 0.11, [CASE]: 0.11, [FIT]: 0.1, [THE2]: 0.06, [THE]: 0.05, [DOESN]: 0.05, [IN]: 0.04 },
  [S]: { [S]: 0.3, [IT]: 0.55, [BECAUSE]: 0.15 },
  [TOO]: { [TOO]: 0.3, [S]: 0.25, [IT]: 0.35, [FIT]: 0.1 },
  [BIG]: { [TROPHY]: 0.75, [IT]: 0.2, [SUIT]: 0.02, [CASE]: 0.01, [BIG]: 0.02 },
  [STOP]: { [STOP]: 0.3, [BIG]: 0.3, [BECAUSE]: 0.2, [TROPHY]: 0.2 },
  [WHAT]: { [WHAT]: 0.35, [STOP]: 0.3, [IT]: 0.2, [THE]: 0.15 },
  [S2]: { [S2]: 0.3, [WHAT]: 0.55, [S]: 0.15 },
  [TOO2]: { [TOO2]: 0.3, [S2]: 0.25, [WHAT]: 0.3, [TOO]: 0.15 },
  [BIG2]: { [TROPHY]: 0.45, [BIG]: 0.15, [IT]: 0.15, [WHAT]: 0.1, [TOO2]: 0.1, [BIG2]: 0.05 },
  [ASK]: { [TROPHY]: 0.6, [BIG2]: 0.12, [WHAT]: 0.1, [TOO2]: 0.05, [IT]: 0.05, [ASK]: 0.08 },
};

/** Reader one's rows where the variant changes the story: suit and case take trophy's place. */
const READER_ONE_SMALL: Record<number, Sparse> = {
  [BIG]: { [SUIT]: 0.4, [CASE]: 0.33, [IT]: 0.2, [TROPHY]: 0.03, [BIG]: 0.04 },
  [STOP]: { [STOP]: 0.3, [BIG]: 0.3, [BECAUSE]: 0.2, [SUIT]: 0.1, [CASE]: 0.1 },
  [BIG2]: { [SUIT]: 0.25, [CASE]: 0.2, [BIG]: 0.15, [IT]: 0.15, [WHAT]: 0.1, [TOO2]: 0.1, [BIG2]: 0.05 },
  [ASK]: { [SUIT]: 0.33, [CASE]: 0.27, [BIG2]: 0.12, [WHAT]: 0.1, [TOO2]: 0.05, [IT]: 0.05, [ASK]: 0.08 },
};

/** Reader two mostly looks at the piece just before. At "it" it hesitates, and at the story's rows it glances further. */
const READER_TWO: Record<number, Sparse> = {
  [IT]: { [BECAUSE]: 0.28, [IT]: 0.25, [CASE]: 0.15, [SUIT]: 0.12, [TROPHY]: 0.12, [FIT]: 0.08 },
  [BIG]: { [TOO]: 0.45, [BIG]: 0.25, [TROPHY]: 0.15, [IT]: 0.1, [S]: 0.05 },
  [BIG2]: { [TOO2]: 0.45, [BIG2]: 0.2, [TROPHY]: 0.15, [IT]: 0.1, [BIG]: 0.1 },
  [ASK]: { [BIG2]: 0.55, [ASK]: 0.3, [TOO2]: 0.1, [TROPHY]: 0.05 },
};

const READER_TWO_SMALL: Record<number, Sparse> = {
  [BIG]: { [TOO]: 0.45, [BIG]: 0.25, [CASE]: 0.15, [IT]: 0.1, [S]: 0.05 },
  [BIG2]: { [TOO2]: 0.45, [BIG2]: 0.2, [CASE]: 0.15, [IT]: 0.1, [BIG]: 0.1 },
  [ASK]: { [BIG2]: 0.55, [ASK]: 0.3, [TOO2]: 0.1, [CASE]: 0.05 },
};

/** Reader three looks at punctuation and at "because". */
const READER_THREE: Record<number, Sparse> = {
  [IT]: { [BECAUSE]: 0.22, [IT]: 0.22, [T]: 0.16, [DOESN]: 0.14, [THE]: 0.13, [FIT]: 0.13 },
  [BIG]: { [BECAUSE]: 0.4, [IT]: 0.25, [TROPHY]: 0.2, [BIG]: 0.15 },
  [BIG2]: { [STOP]: 0.3, [BECAUSE]: 0.2, [BIG2]: 0.25, [TROPHY]: 0.25 },
  [ASK]: { [STOP]: 0.35, [BECAUSE]: 0.2, [ASK]: 0.25, [TROPHY]: 0.2 },
};

const READER_THREE_SMALL: Record<number, Sparse> = {
  [BIG]: { [BECAUSE]: 0.4, [IT]: 0.25, [CASE]: 0.1, [SUIT]: 0.1, [BIG]: 0.15 },
  [BIG2]: { [STOP]: 0.3, [BECAUSE]: 0.2, [BIG2]: 0.25, [SUIT]: 0.12, [CASE]: 0.13 },
  [ASK]: { [STOP]: 0.35, [BECAUSE]: 0.2, [ASK]: 0.25, [CASE]: 0.1, [SUIT]: 0.1 },
};

const PUNCTUATION = new Set([T, S, STOP, S2, ASK]);

/** Reader two's everyday row: most weight on the piece before, some on itself, a little spread. */
function previous(i: number): Sparse {
  if (i === 1) return { 1: 1 };
  if (i === 2) return { 1: 0.65, 2: 0.35 };
  const row: Record<number, number> = { [i - 1]: 0.6, [i]: 0.3 };
  for (let j = 1; j <= i - 2; j++) row[j] = 0.1 / (i - 2);
  return row;
}

/** Reader three's everyday row: itself, "because" once it has been read, and the last full stop. */
function marks(i: number): Sparse {
  if (i === 1) return { 1: 1 };
  const row: Record<number, number> = { [i]: 0.3, [i - 1]: 0.1 };
  let left = 0.6;
  if (i > BECAUSE) {
    row[BECAUSE] = (row[BECAUSE] ?? 0) + (i > STOP ? 0.2 : 0.35);
    left -= i > STOP ? 0.2 : 0.35;
  }
  if (i > STOP) {
    row[STOP] = (row[STOP] ?? 0) + 0.3;
    left -= 0.3;
  }
  // The rest goes to the marks already read, or evenly to what came before.
  const earlier = [...Array(i - 1).keys()].map((k) => k + 1);
  const seen = earlier.filter((j) => PUNCTUATION.has(j) && !(j in row));
  const share = seen.length ? seen : earlier;
  for (const j of share) row[j] = (row[j] ?? 0) + left / share.length;
  return row;
}

function dense(sparse: Sparse, i: number): number[] {
  const out = new Array(PIECE_COUNT).fill(0);
  let sum = 0;
  for (const [key, w] of Object.entries(sparse)) {
    const j = Number(key);
    // Causal: a piece may only look at itself and earlier pieces.
    if (j > i) throw new Error(`Row ${i} looks ahead at ${j}`);
    out[j - 1] = w;
    sum += w;
  }
  return out.map((w) => w / sum);
}

function build(rows: (i: number) => Sparse): Matrix {
  return Array.from({ length: PIECE_COUNT }, (_, k) => dense(rows(k + 1), k + 1));
}

const pick = (hand: Record<number, Sparse>, small: Record<number, Sparse>, fallback: (i: number) => Sparse, variant: Variant) => (i: number) =>
  (variant === 'small' ? small[i] : undefined) ?? hand[i] ?? fallback(i);

const never = (): Sparse => {
  throw new Error('Reader one has a row for every piece');
};

function readersFor(variant: Variant): readonly Matrix[] {
  return [
    build(pick(READER_ONE, READER_ONE_SMALL, never, variant)),
    build(pick(READER_TWO, READER_TWO_SMALL, previous, variant)),
    build(pick(READER_THREE, READER_THREE_SMALL, marks, variant)),
  ];
}

export const READERS: Record<Variant, readonly Matrix[]> = { big: readersFor('big'), small: readersFor('small') };

/** The averaged view, the default. */
export const ALL: Record<Variant, Matrix> = {
  big: mean(READERS.big),
  small: mean(READERS.small),
};

function mean(matrices: readonly Matrix[]): Matrix {
  return matrices[0].map((row, i) => row.map((_, j) => matrices.reduce((sum, m) => sum + m[i][j], 0) / matrices.length));
}

/** The weights for a view: rows are pieces (0-based), columns the pieces they weigh. */
export function weights(variant: Variant, view: View): Matrix {
  return view === 'all' ? ALL[variant] : READERS[variant][view];
}

/** Where piece `i` (0-based) looks hardest among the pieces before it, in a view. */
export function strongest(variant: Variant, view: View, i: number): { j: number; w: number } | null {
  const row = weights(variant, view)[i];
  let best: { j: number; w: number } | null = null;
  for (let j = 0; j < i; j++) if (!best || row[j] > best.w) best = { j, w: row[j] };
  return best;
}
