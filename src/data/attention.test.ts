import { describe, expect, it } from 'vitest';
import { ALL, PIECE_COUNT, READERS, strongest, weights, type Matrix } from './attention';
import { LETTERS, PIECES } from './specimen';
import { spokenPiece } from './chart';
import html from '../../index.html?raw';

// Piece indices, 0-based.
const TROPHY = 1, SUIT = 7, CASE = 8, BECAUSE = 9, IT = 10, TOO = 12, BIG = 13, STOP = 14, ASK = 19;

const every = (fn: (m: Matrix, name: string) => void) => {
  for (const variant of ['big', 'small'] as const) {
    READERS[variant].forEach((m, r) => fn(m, `${variant} reader ${r + 1}`));
    fn(ALL[variant], `${variant} all`);
  }
};

const largestOther = (row: readonly number[], except: number[]) =>
  Math.max(...row.filter((_, j) => !except.includes(j)));

describe('attention', () => {
  it('has twenty rows of twenty, one per piece', () => {
    every((m) => {
      expect(m).toHaveLength(PIECE_COUNT);
      for (const row of m) expect(row).toHaveLength(PIECE_COUNT);
    });
    expect(PIECES.big).toHaveLength(PIECE_COUNT);
  });

  it('is causal: no piece ever weighs a piece after it', () => {
    every((m, name) => {
      m.forEach((row, i) => row.forEach((w, j) => {
        if (j > i) expect(w, `${name} row ${i + 1} → ${j + 1}`).toBe(0);
      }));
    });
  });

  it('gives every row a total weight of 1', () => {
    every((m) => m.forEach((row) => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)));
  });

  it('never weighs anything below zero', () => {
    every((m) => m.forEach((row) => row.forEach((w) => expect(w).toBeGreaterThanOrEqual(0))));
  });

  it('spreads the weight at it, uncertain, in both variants', () => {
    for (const variant of ['big', 'small'] as const) expect(Math.max(...ALL[variant][IT])).toBeLessThan(0.25);
  });

  it('ties big to trophy, with it second', () => {
    const row = ALL.big[BIG];
    expect(row[TROPHY]).toBeGreaterThanOrEqual(0.35);
    expect(row[TROPHY]).toBeLessThanOrEqual(0.45);
    expect(row[TROPHY]).toBe(Math.max(...row));
    expect(row[IT]).toBeGreaterThanOrEqual(0.15);
    expect(row[IT]).toBeLessThanOrEqual(0.25);
    expect(row[IT]).toBe(largestOther(row, [TROPHY]));
  });

  it('ties small to suit and case together, with it the largest single other piece', () => {
    const row = ALL.small[BIG];
    expect(row[SUIT] + row[CASE]).toBeGreaterThan(largestOther(row, [SUIT, CASE]));
    expect(row[IT]).toBe(largestOther(row, [SUIT, CASE]));
  });

  it('reaches back from the question to the answer', () => {
    expect(ALL.big[ASK][TROPHY]).toBe(Math.max(...ALL.big[ASK]));
    const small = ALL.small[ASK];
    expect(small[SUIT] + small[CASE]).toBeGreaterThan(largestOther(small, [SUIT, CASE]));
  });

  it('keeps the readers to their illustrative jobs', () => {
    // Reader two: mostly the piece before.
    const previous = READERS.big[1].filter((_, i) => i > 0 && strongest('big', 1, i)?.j === i - 1).length;
    expect(previous).toBeGreaterThanOrEqual(15);
    // Reader three: after "because", its strongest look back is at "because" or a mark.
    for (let i = BECAUSE + 1; i < PIECE_COUNT; i++) {
      if (i === IT || i === BIG) continue;
      const s = strongest('big', 2, i)!;
      expect([BECAUSE, STOP, 3, 11, 16], `row ${i + 1}`).toContain(s.j);
    }
    expect(weights('big', 0)[BIG][TROPHY]).toBeGreaterThan(0.6);
  });

  it('changes only the story rows between the variants', () => {
    const differ = ALL.big.map((row, i) => (row.some((w, j) => Math.abs(w - ALL.small[i][j]) > 1e-12) ? i + 1 : null)).filter(Boolean);
    expect(differ).toEqual([14, 15, 19, 20]);
  });

  it('keeps too before big, where reader two looks', () => {
    expect(strongest('big', 1, BIG)!.j).toBe(TOO);
  });

  it('writes the same strongest threads into the page as the data holds', () => {
    const rows = [...html.matchAll(/<tr><th scope="row">([^<]+)<\/th><td>([^<]+)<\/td><td data-weight>([^<]+)<\/td><\/tr>/g)];
    expect(rows).toHaveLength(PIECE_COUNT);
    rows.forEach((m, i) => {
      const s = strongest('big', 'all', i);
      expect(m[1]).toBe(`${LETTERS[i]}, ${spokenPiece(PIECES.big[i])}`);
      expect(m[2]).toBe(s ? `${LETTERS[s.j]}, ${spokenPiece(PIECES.big[s.j])}` : 'only itself');
      expect(m[3]).toBe(s ? s.w.toFixed(2) : '1.00');
    });
  });

  it('reaches from the second big back to trophy', () => {
    expect(strongest('big', 'all', 18)!.j).toBe(TROPHY);
  });
});
