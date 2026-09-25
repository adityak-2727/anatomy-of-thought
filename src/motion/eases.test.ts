import { describe, expect, it } from 'vitest';
import { DUR, FRONT, LIST, PINS, PLATE1 } from './eases';

// The brief's timing rules (BRIEF §5–6), held against the storyboards.

describe('the frontispiece', () => {
  const end = Math.max(
    FRONT.developAt + FRONT.develop,
    FRONT.washAt + FRONT.subtitleLag + FRONT.washSpread + FRONT.washJitter + FRONT.wash,
    FRONT.hintAt + FRONT.print,
  );

  it('lasts about three seconds', () => {
    expect(end).toBeGreaterThan(2.5);
    expect(end).toBeLessThan(3.5);
  });

  it('is brushed in three or four broad strokes, no two alike', () => {
    expect(FRONT.strokes.length).toBeGreaterThanOrEqual(3);
    expect(FRONT.strokes.length).toBeLessThanOrEqual(4);
    const durations = FRONT.strokes.map((s) => s.dur);
    expect(new Set(durations).size).toBe(durations.length);
  });

  it('develops within the exposure range (1.2–2.6s)', () => {
    expect(FRONT.develop).toBeGreaterThanOrEqual(1.2);
    expect(FRONT.develop).toBeLessThanOrEqual(2.6);
  });

  it('prints the imprint and hint last', () => {
    expect(FRONT.imprintAt).toBeGreaterThan(FRONT.developAt);
    expect(FRONT.hintAt).toBeGreaterThan(FRONT.imprintAt);
  });
});

describe('responses', () => {
  it('keep hover responses within 120–220ms', () => {
    for (const d of [LIST.dot, LIST.undo, DUR.respondFast, DUR.respond, DUR.respondSlow]) {
      expect(d).toBeGreaterThanOrEqual(0.12);
      expect(d).toBeLessThanOrEqual(0.22);
    }
  });

  it('travel to a plate in 1.2–1.6s', () => {
    expect(DUR.travel).toEqual([1.2, 1.6]);
  });
});

describe('Plate I', () => {
  const inUnit = (r: readonly [number, number]) => r[0] >= 0 && r[1] <= 1 && r[0] < r[1];

  it('keeps every approach beat inside the approach', () => {
    for (const r of Object.values(PLATE1.approach)) expect(inUnit(r)).toBe(true);
  });

  it('keeps every pinned beat inside the pin, and leaves a rest at the end', () => {
    const length = PINS[1][0];
    const last = Math.max(...Object.values(PLATE1.pin).map((r) => r[1]));
    expect(last).toBeLessThan(length * 0.88);
  });

  it('exposes over 40–60vh of scroll, as the brief asks of scrubbed exposures', () => {
    const [from, to] = PLATE1.pin.exposure;
    expect(to - from).toBeGreaterThanOrEqual(40);
    expect(to - from).toBeLessThanOrEqual(60);
  });
});
