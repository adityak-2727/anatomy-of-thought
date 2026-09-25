// The illustrative tokeniser (BRIEF §10). Deterministic and dependency-free. It is a
// drawing of how real tokenisers behave, not one of them; every model cuts differently.
//
// 1. Punctuation becomes its own piece. A leading space belongs to the piece after it.
// 2. Contractions split: "doesn't" becomes "doesn" + "'t"; 's 're 've 'll 'd 'm split off.
// 3. Words on the chart, or among about three hundred common words, stay whole.
// 4. Other words split, in this order: at known prefixes and suffixes; into two known
//    parts (suit + case); and anything still longer than seven letters into chunks of 3–5.
// 5. At most forty pieces.
//
// Pieces are returned as the machine holds them: leading space included, straight
// apostrophe (a curly one in the input is read as the same character).

import { VOCAB_WORDS } from '../data/vocab';
import { COMMON_WORDS } from '../data/common-words';

export const MAX_PIECES = 40;

const PREFIXES = ['pre', 'dis', 'un', 're'];
const SUFFIXES = ['tion', 'ness', 'ment', 'able', 'less', 'ful', 'ing', 'est', 'ed', 'er', 'ly'];
const ENDINGS = ["'t", "'s", "'re", "'ve", "'ll", "'d", "'m"];
/** An affix only comes off if at least this much word remains. */
const MIN_CORE = 3;
/** Words longer than this, still unexplained, are cut into chunks. */
const MAX_WHOLE = 7;
const CHUNK = { min: 3, max: 5 };

const KNOWN: ReadonlySet<string> = new Set([...VOCAB_WORDS, ...COMMON_WORDS]);

export interface Tokenised {
  /** At most MAX_PIECES pieces. */
  pieces: string[];
  /** How many pieces the whole text made, before the cap. */
  total: number;
}

// A word (letters or digits, with inner apostrophes) or any single other visible character,
// each with the space in front of it, if any.
const TOKEN = /( ?)([\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*|[^\s\p{L}\p{N}])/gu;

export function tokenise(text: string, known: ReadonlySet<string> = KNOWN): Tokenised {
  const clean = text.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const pieces: string[] = [];
  for (const match of clean.matchAll(TOKEN)) {
    const space = match[1];
    const token = match[2];
    const parts = /[\p{L}\p{N}]/u.test(token) ? splitWord(token, known) : [token];
    parts.forEach((part, i) => pieces.push(i === 0 ? space + part : part));
  }
  return { pieces: pieces.slice(0, MAX_PIECES), total: pieces.length };
}

function isKnown(word: string, known: ReadonlySet<string>): boolean {
  return known.has(word.toLowerCase());
}

/** Rule 2 first: a contraction's ending comes off; other apostrophes are punctuation. */
function splitWord(word: string, known: ReadonlySet<string>): string[] {
  const last = word.lastIndexOf("'");
  if (last > 0) {
    const ending = word.slice(last);
    if (ENDINGS.includes(ending.toLowerCase())) return [...splitWord(word.slice(0, last), known), ending];
    const head = word.slice(0, last);
    return [...splitWord(head, known), "'", ...splitWord(word.slice(last + 1), known)];
  }
  return splitCore(word, known);
}

/** Rules 3 and 4a: known words stay whole; otherwise a prefix and a suffix may come off. */
function splitCore(word: string, known: ReadonlySet<string>): string[] {
  if (isKnown(word, known)) return [word];
  const lower = word.toLowerCase();
  let start = '';
  let rest = word;
  const prefix = PREFIXES.find((p) => lower.startsWith(p) && word.length - p.length >= MIN_CORE);
  if (prefix) {
    start = word.slice(0, prefix.length);
    rest = word.slice(prefix.length);
  }
  let end = '';
  const restLower = rest.toLowerCase();
  const suffix = SUFFIXES.find((s) => restLower.endsWith(s) && rest.length - s.length >= MIN_CORE);
  if (suffix) {
    end = rest.slice(rest.length - suffix.length);
    rest = rest.slice(0, rest.length - suffix.length);
  }
  return [start, ...splitStem(rest, known), end].filter(Boolean);
}

/** Rules 4b and 4c: two known parts, or chunks of three to five letters. */
function splitStem(stem: string, known: ReadonlySet<string>): string[] {
  if (isKnown(stem, known)) return [stem];
  for (let i = MIN_CORE; i <= stem.length - MIN_CORE; i++) {
    const a = stem.slice(0, i);
    const b = stem.slice(i);
    if (isKnown(a, known) && isKnown(b, known)) return [a, b];
  }
  if (stem.length <= MAX_WHOLE) return [stem];
  return chunks(stem);
}

/** Even chunks, each CHUNK.min–CHUNK.max letters long. */
function chunks(stem: string): string[] {
  const count = Math.ceil(stem.length / CHUNK.max);
  const base = Math.floor(stem.length / count);
  let extra = stem.length - base * count;
  const out: string[] = [];
  let at = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (extra-- > 0 ? 1 : 0);
    out.push(stem.slice(at, at + size));
    at += size;
  }
  return out;
}
