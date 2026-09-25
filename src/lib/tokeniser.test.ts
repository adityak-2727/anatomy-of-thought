import { describe, expect, it } from 'vitest';
import { MAX_PIECES, tokenise } from './tokeniser';
import { PIECES, REPLY, SENTENCE, DISPLAY } from '../data/specimen';

const pieces = (text: string) => tokenise(text).pieces;

describe('the specimen', () => {
  it('cuts exactly as BRIEF §3 says, for big', () => {
    expect(pieces(SENTENCE.big)).toEqual(PIECES.big);
  });

  it('cuts exactly as BRIEF §3 says, for small', () => {
    expect(pieces(SENTENCE.small)).toEqual(PIECES.small);
  });

  it('reads curly apostrophes as straight ones', () => {
    expect(pieces(DISPLAY.big)).toEqual(PIECES.big);
  });

  it('cuts the replies as Plate VI sets them', () => {
    expect(pieces('The trophy.')).toEqual([...REPLY.big]);
    expect(pieces('The suitcase.')).toEqual([...REPLY.small]);
  });
});

describe('rule 1: punctuation and spaces', () => {
  it('gives punctuation its own piece', () => {
    expect(pieces('Well, yes!')).toEqual(['Well', ',', ' yes', '!']);
  });

  it('gives a leading space to the piece after it', () => {
    expect(pieces('cat and dog')).toEqual(['cat', ' and', ' dog']);
  });

  it('treats any run of white space as one space, and trims the ends', () => {
    expect(pieces('  cat \n\t and   dog ')).toEqual(['cat', ' and', ' dog']);
  });
});

describe('rule 2: contractions', () => {
  it.each([
    ["doesn't", ['doesn', "'t"]],
    ["can't", ['can', "'t"]],
    ["it's", ['it', "'s"]],
    ["they're", ['they', "'re"]],
    ["we've", ['we', "'ve"]],
    ["she'll", ['she', "'ll"]],
    ["he'd", ['he', "'d"]],
    ["I'm", ['I', "'m"]],
  ])('%s', (word, expected) => {
    expect(pieces(word)).toEqual(expected);
  });

  it('treats other apostrophes as punctuation', () => {
    expect(pieces("o'clock")).toEqual(['o', "'", 'clock']);
  });
});

describe('rules 3 and 4: whole words and split words', () => {
  it('keeps chart words and common words whole', () => {
    expect(pieces('The medal and the ribbon')).toEqual(['The', ' medal', ' and', ' the', ' ribbon']);
  });

  it('splits at known prefixes and suffixes', () => {
    expect(pieces('unkind')).toEqual(['un', 'kind']);
    expect(pieces('kindness')).toEqual(['kind', 'ness']);
    expect(pieces('unkindness')).toEqual(['un', 'kind', 'ness']);
  });

  it('splits into two known parts', () => {
    expect(pieces('suitcase')).toEqual(['suit', 'case']);
    expect(pieces('raincoat')).toEqual(['rain', 'coat']);
  });

  it('cuts anything still longer than seven letters into chunks of three to five', () => {
    const cut = pieces('xylophonist');
    expect(cut.join('')).toBe('xylophonist');
    for (const chunk of cut) {
      expect(chunk.length).toBeGreaterThanOrEqual(3);
      expect(chunk.length).toBeLessThanOrEqual(5);
    }
  });

  it('leaves short unknown words whole', () => {
    expect(pieces('zorb')).toEqual(['zorb']);
  });

  it('keeps the leading space on the first part only', () => {
    expect(pieces('a suitcase')).toEqual(['a', ' suit', 'case']);
  });
});

describe('rule 5 and determinism', () => {
  it('returns at most forty pieces, and says how many there were', () => {
    const long = Array.from({ length: 30 }, () => 'cat, dog').join(' ');
    const result = tokenise(long);
    expect(result.pieces.length).toBe(MAX_PIECES);
    expect(result.total).toBeGreaterThan(MAX_PIECES);
  });

  it('always cuts the same text the same way', () => {
    const text = 'The unbreakable raincoat doesn’t fit in my rucksack.';
    expect(pieces(text)).toEqual(pieces(text));
  });
});
