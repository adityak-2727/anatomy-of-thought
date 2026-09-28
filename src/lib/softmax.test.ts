import { describe, expect, it } from 'vitest';
import { percent, sample, softmax } from './softmax';
import { SCORES } from '../data/specimen';

const big = SCORES.big.map((c) => c.score);

describe('softmax', () => {
  it('turns scores into likelihoods that sum to 1', () => {
    for (const t of [0.1, 0.5, 1, 1.5, 2]) {
      expect(softmax(big, t).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    }
  });

  it('gives trophy about 92.5% at temperature 1, as the brief checks', () => {
    expect(softmax(big, 1)[0]).toBeGreaterThan(0.92);
    expect(softmax(big, 1)[0]).toBeLessThan(0.93);
  });

  it('takes only the favourite at 0.05 and below', () => {
    expect(softmax(big, 0.05)).toEqual([1, 0, 0, 0, 0, 0, 0]);
    expect(softmax(big, 0)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it('grows adventurous as it warms', () => {
    expect(softmax(big, 2)[0]).toBeLessThan(softmax(big, 1)[0]);
    expect(softmax(big, 2)[6]).toBeGreaterThan(softmax(big, 1)[6]);
  });

  it('stays finite with very large scores', () => {
    const p = softmax([1000, 999, 998], 1);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('favours suit in the variant', () => {
    const small = softmax(SCORES.small.map((c) => c.score), 1);
    expect(small[0]).toBe(Math.max(...small));
  });
});

describe('sample', () => {
  it('draws by the cumulative likelihoods', () => {
    const p = [0.5, 0.3, 0.2];
    expect(sample(p, 0)).toBe(0);
    expect(sample(p, 0.49)).toBe(0);
    expect(sample(p, 0.5)).toBe(1);
    expect(sample(p, 0.79)).toBe(1);
    expect(sample(p, 0.8)).toBe(2);
    expect(sample(p, 0.9999)).toBe(2);
  });

  it('always takes the favourite when the machine is cold', () => {
    for (const r of [0, 0.3, 0.99]) expect(sample(softmax(big, 0.05), r)).toBe(0);
  });
});

describe('percent', () => {
  it('writes one decimal place', () => {
    expect(percent(0.9248)).toBe('92.5%');
    expect(percent(0.003)).toBe('0.3%');
  });
});
