// The specimen (BRIEF §3): one riddle, its variant, its pieces and their illustrative IDs,
// its replies, and the scores for the answer. (Attention weights are in attention.ts.)

import { pieceId } from '../lib/hash';

export type Variant = 'big' | 'small';

/** As the machine receives it (straight apostrophes). */
export const SENTENCE: Record<Variant, string> = {
  big: "The trophy doesn't fit in the suitcase because it's too big. What's too big?",
  small: "The trophy doesn't fit in the suitcase because it's too small. What's too small?",
};

/** As the reader sees it. */
export const DISPLAY: Record<Variant, string> = {
  big: 'The trophy doesn’t fit in the suitcase because it’s too big. What’s too big?',
  small: 'The trophy doesn’t fit in the suitcase because it’s too small. What’s too small?',
};

/** Exactly the pieces of BRIEF §3. A leading space belongs to the piece after it. */
export const PIECES: Record<Variant, readonly string[]> = {
  big: ['The', ' trophy', ' doesn', "'t", ' fit', ' in', ' the', ' suit', 'case', ' because', ' it', "'s", ' too', ' big', '.', ' What', "'s", ' too', ' big', '?'],
  small: ['The', ' trophy', ' doesn', "'t", ' fit', ' in', ' the', ' suit', 'case', ' because', ' it', "'s", ' too', ' small', '.', ' What', "'s", ' too', ' small', '?'],
};

/** The letters that label the pieces on Plate II, as on an anatomical plate. */
export const LETTERS = 'abcdefghijklmnopqrst'.split('');

/** On Plate II the sentence lies on two strips; the second begins with this piece (0-based). */
export const SECOND_STRIP = 9;

/** The reply, one piece at a time, before the end mark. */
export const REPLY: Record<Variant, readonly string[]> = {
  big: ['The', ' trophy', '.'],
  small: ['The', ' suit', 'case', '.'],
};

export function ids(pieces: readonly string[]): number[] {
  return pieces.map(pieceId);
}

/** The reply ends with an end mark: not a word, but a piece all the same, with its own number. */
export const END = '<end>';

/**
 * Illustrative scores (logits) for the piece after the reply's first "The" (BRIEF §3):
 * the seven likeliest candidates. A real model scores every piece it knows.
 */
export const SCORES: Record<Variant, readonly { piece: string; score: number }[]> = {
  big: [
    { piece: ' trophy', score: 6.1 },
    { piece: ' suit', score: 3.2 },
    { piece: ' cup', score: 1.4 },
    { piece: ' prize', score: 1.0 },
    { piece: ' bag', score: 0.6 },
    { piece: ' box', score: 0.5 },
    { piece: ' medal', score: 0.4 },
  ],
  small: [
    { piece: ' suit', score: 5.9 },
    { piece: ' trophy', score: 3.0 },
    { piece: ' bag', score: 1.5 },
    { piece: ' box', score: 1.2 },
    { piece: ' case', score: 0.8 },
    { piece: ' trunk', score: 0.5 },
    { piece: ' cup', score: 0.3 },
  ],
};

/** The answer, printed once the reply is complete. */
export const ANSWER: Record<Variant, string> = { big: 'The trophy.', small: 'The suitcase.' };
