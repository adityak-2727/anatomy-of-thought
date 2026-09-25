import { describe, expect, it } from 'vitest';
import { CONSTELLATIONS, VOCAB_WORDS } from './vocab';
import { COMMON_WORDS } from './common-words';
import { LETTERS, PIECES, REPLY, ids } from './specimen';
import html from '../../index.html?raw';

describe('the specimen', () => {
  it('has twenty pieces, lettered a to t', () => {
    expect(PIECES.big).toHaveLength(20);
    expect(PIECES.small).toHaveLength(20);
    expect(LETTERS.join('')).toBe('abcdefghijklmnopqrst');
  });

  it('differs between big and small only at pieces 14 and 19', () => {
    const differ = PIECES.big.map((p, i) => (p === PIECES.small[i] ? null : i + 1)).filter(Boolean);
    expect(differ).toEqual([14, 19]);
  });

  it('gives every distinct piece its own ID, in 100–99,999', () => {
    const distinct = [...new Set([...PIECES.big, ...PIECES.small, ...REPLY.big, ...REPLY.small])];
    const numbers = ids(distinct);
    expect(new Set(numbers).size).toBe(distinct.length);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(99999);
    }
  });

  it('writes the same IDs into the page as the hash gives (for readers without JavaScript)', () => {
    const written = [...html.matchAll(/<td data-id>(\d+)<\/td>/g)].map((m) => Number(m[1]));
    expect(written).toEqual(ids(PIECES.big));
  });
});

describe('the chart’s words', () => {
  it('has fifteen constellations of 25–45 words, 400–600 in all', () => {
    expect(CONSTELLATIONS).toHaveLength(15);
    for (const c of CONSTELLATIONS) {
      expect(c.words.length).toBeGreaterThanOrEqual(25);
      expect(c.words.length).toBeLessThanOrEqual(45);
    }
    const total = CONSTELLATIONS.reduce((n, c) => n + c.words.length, 0);
    expect(total).toBeGreaterThanOrEqual(400);
    expect(total).toBeLessThanOrEqual(600);
  });

  it('lists each word once', () => {
    const all = CONSTELLATIONS.flatMap((c) => c.words);
    expect(new Set(all).size).toBe(all.length);
  });

  it('holds every piece of both specimens and both replies', () => {
    for (const piece of [...PIECES.big, ...PIECES.small, ...REPLY.big, ...REPLY.small]) {
      expect(VOCAB_WORDS.has(piece.trim().toLowerCase())).toBe(true);
    }
  });

  it('puts the required words in their constellations', () => {
    const where = (w: string) => CONSTELLATIONS.find((c) => c.words.includes(w))?.id;
    expect(where('suit')).toBe('wardrobe');
    expect(where('case')).toBe('chest');
    for (const w of ['it', 'the', "'s", "'t", 'doesn', 'too', '.', '?']) expect(where(w)).toBe('centre');
    for (const w of ['trophy', 'medal', 'cup', 'prize']) expect(where(w)).toBe('laurel');
    for (const w of ['box', 'bag', 'trunk']) expect(where(w)).toBe('chest');
    for (const w of ['big', 'small']) expect(where(w)).toBe('rule');
  });

  it('does not know suitcase as one word', () => {
    expect(VOCAB_WORDS.has('suitcase')).toBe(false);
  });

  it('avoids the words the brief bans', () => {
    for (const w of ['journey', 'realm', 'tapestry', 'unleash', 'elevate', 'harness', 'unlock', 'empower']) {
      expect(VOCAB_WORDS.has(w)).toBe(false);
    }
  });

  it('keeps about three hundred common words', () => {
    expect(new Set(COMMON_WORDS).size).toBeGreaterThanOrEqual(250);
    expect(new Set(COMMON_WORDS).size).toBeLessThanOrEqual(350);
  });
});
