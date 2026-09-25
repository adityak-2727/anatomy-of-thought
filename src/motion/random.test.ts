import { describe, expect, it } from 'vitest';
import { mulberry32, rand, rngFor, signed } from './random';

describe('seeded randomness', () => {
  it('repeats exactly for the same seed', () => {
    const a = mulberry32(1843);
    const b = mulberry32(1843);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('stays within [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives different things different numbers under one seed', () => {
    expect(rand(1844, 'pin')).not.toBe(rand(1844, 'thread'));
    expect(rngFor(1844, 'a')()).toBe(rngFor(1844, 'a')());
  });

  it('signed values stay within [-1, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = signed(1845, i);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
    }
  });
});
