// A piece: a paper slip carrying one token, with its pin, its letter and its ticker strip.

import { pieceId } from '../lib/hash';
import { signed } from '../motion/random';
import { createTicker } from './ticker';
import { leaderPath, pinMark, slipClip, svgEl } from './marks';

const MAX_TURN = 0.8; // degrees: pinned labels may turn up to ±0.8° (BRIEF §4)
// The pin goes through the slip's corner, clear of the first letter.
const PIN_INSET = { x: 3, y: 3 };

export interface PieceOptions {
  /** The piece as the machine holds it, leading space included, straight apostrophe. */
  text: string;
  seed: number;
  letter?: string;
  ticker?: boolean;
}

export interface Piece {
  root: HTMLElement;
  slip: HTMLElement;
  text: string;
  id: number;
  seed: number;
  letter?: HTMLElement;
  leader?: SVGSVGElement;
  ticker?: HTMLElement;
  pin?: SVGSVGElement;
}

/** What the reader sees: no leading space, and a real apostrophe. */
export function displayText(text: string): string {
  return text.replace(/^ /, '').replace(/'/g, '’');
}

export function createPiece(options: PieceOptions): Piece {
  const { text, seed } = options;
  const root = document.createElement('span');
  root.className = 'piece';
  root.style.setProperty('--turn', `${(signed(seed, 'turn') * MAX_TURN).toFixed(2)}deg`);

  const slip = document.createElement('span');
  slip.className = 'slip';
  slip.style.setProperty('--slip-clip', slipClip(seed));
  slip.textContent = displayText(text);
  root.append(slip);

  const piece: Piece = { root, slip, text, id: pieceId(text), seed };

  if (options.letter) {
    const letter = document.createElement('span');
    letter.className = 'letter';
    letter.textContent = options.letter;
    letter.setAttribute('aria-hidden', 'true');
    const leader = svgEl('svg', { class: 'leader', viewBox: '0 0 8 14', 'aria-hidden': 'true', focusable: 'false' });
    svgEl('path', { d: leaderPath(4, 0.5, 4, 13.5, seed) }, leader);
    root.append(leader, letter);
    piece.letter = letter;
    piece.leader = leader;
  }

  if (options.ticker) {
    piece.ticker = createTicker(String(piece.id), seed);
    piece.ticker.setAttribute('aria-hidden', 'true');
    root.append(piece.ticker);
  }
  return piece;
}

/**
 * Pin a large slip at both ends, as the specimen is pinned: the pins sit inside its
 * top corners and their shafts point up and out, leaving white shadows on the blue.
 */
// Inside the slip's top corners, in its margin, clear of the first and last letters.
const END_INSET = { x: 12, y: 11 };

export function pinSlipEnds(wrap: HTMLElement, slip: HTMLElement, seed: number): [SVGSVGElement, SVGSVGElement] {
  wrap.querySelectorAll(':scope > .pin').forEach((p) => p.remove());
  const w = slip.offsetWidth;
  const h = slip.offsetHeight;
  const left = pinMark(seed + 1, { x: 0, y: 0, w, h }, -150);
  const right = pinMark(seed + 2, { x: 0, y: 0, w, h }, -30);
  wrap.append(left, right);
  refitSlipEnds(slip, [left, right]);
  return [left, right];
}

/**
 * Keep the same two pins in step with the slip after it resizes: move the right one,
 * and move the clip that decides where each pin is ink (on the slip) or white (on the blue).
 */
export function refitSlipEnds(slip: HTMLElement, pins: [SVGSVGElement, SVGSVGElement]): void {
  const w = slip.offsetWidth;
  const h = slip.offsetHeight;
  const heads = [END_INSET.x, w - END_INSET.x];
  pins.forEach((pin, i) => {
    pin.style.left = `${heads[i]}px`;
    pin.style.top = `${END_INSET.y}px`;
    const rect = pin.querySelector('clipPath rect');
    rect?.setAttribute('x', String(-heads[i]));
    rect?.setAttribute('y', String(-END_INSET.y));
    rect?.setAttribute('width', String(w));
    rect?.setAttribute('height', String(h));
  });
}

/**
 * Pin a set of pieces. Reads every slip's size first, then writes every pin,
 * so the layout is read once rather than once per piece.
 */
export function pinPieces(pieces: Piece[]): void {
  const sizes = pieces.map((p) => ({ w: p.slip.offsetWidth, h: p.slip.offsetHeight }));
  pieces.forEach((p, i) => {
    p.pin?.remove();
    const { w, h } = sizes[i];
    const pin = pinMark(p.seed, { x: -PIN_INSET.x, y: -PIN_INSET.y, w, h });
    pin.style.left = `${PIN_INSET.x}px`;
    pin.style.top = `${PIN_INSET.y}px`;
    p.root.append(pin);
    p.pin = pin;
  });
}
