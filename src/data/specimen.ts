// The specimen (BRIEF §3): one riddle, its variant, its pieces and their illustrative IDs.
// Attention weights (Phase 5) and answer scores (Phase 6) join this file later.

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
