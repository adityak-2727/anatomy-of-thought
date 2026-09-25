import { describe, expect, it } from 'vitest';
import { fnv1a32, pieceId } from './hash';

describe('fnv1a32', () => {
  it('matches the published FNV-1a test vectors', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });

  it('hashes UTF-8 bytes, so curly punctuation is stable too', () => {
    expect(fnv1a32('’')).toBe(fnv1a32('’'));
    expect(fnv1a32('’')).not.toBe(fnv1a32("'"));
  });
});

describe('pieceId', () => {
  const pieces = ['The', ' trophy', ' doesn', "'t", ' fit', ' in', ' the', ' suit', 'case', ' because', ' it', "'s", ' too', ' big', '.', ' What', '?', ' small'];

  it('stays between 100 and 99,999', () => {
    for (const p of pieces) {
      expect(pieceId(p)).toBeGreaterThanOrEqual(100);
      expect(pieceId(p)).toBeLessThanOrEqual(99999);
    }
  });

  it('never changes between visits', () => {
    expect(pieces.map(pieceId)).toEqual(pieces.map(pieceId));
  });

  it('gives each distinct specimen piece its own number', () => {
    expect(new Set(pieces.map(pieceId)).size).toBe(pieces.length);
  });

  it('tells a leading space apart', () => {
    expect(pieceId(' the')).not.toBe(pieceId('the'));
  });
});
