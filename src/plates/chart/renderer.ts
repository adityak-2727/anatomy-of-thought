// The two drawings of the chart, three.js and SVG, answer to the same description of
// a frame, so the plate can swap one for the other without the story noticing.

import type { View } from '../../lib/projection';
import type { Polyline } from './geometry';

export interface Look {
  view: View;
  /** 0–1: how far the general reveal of the stars has gone. */
  reveal: number;
  /** Per star, 0–1: a star's own reveal, for the ones the specimen's pieces hand off to. */
  own: Float32Array;
  /** 0–1: how far the pen has drawn the constellation lines. */
  draw: number;
  /** The distance at which symbols are drawn at their stated size (the overview's). */
  reference: number;
}

export interface ChartData {
  seed: number;
  thresholds: Float32Array;
  lines: Polyline[];
}

export interface ChartRenderer {
  readonly kind: 'gl' | 'svg';
  /** Resolves when the drawing can be used without stalling the page (its shaders compiled). */
  readonly ready: Promise<void>;
  render(look: Look): void;
  destroy(): void;
}

/** The chart's ink, from the tokens: paper-white, and the constellation lines' strength. */
export function chartInk(): { paper: [number, number, number]; line: number } {
  const css = getComputedStyle(document.documentElement);
  const hex = css.getPropertyValue('--paper').trim().replace('#', '');
  const paper = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return {
    paper,
    line: parseFloat(css.getPropertyValue('--o-constellation')) || 0.4,
  };
}

/** Symbol sizes in CSS px, by magnitude (1 brightest): the sprite's full width, on a wide field. */
export const SYMBOL_SIZE = [0, 26, 21, 13, 10, 6, 5];

/** A narrow field draws its symbols smaller, so constellations stay figures and not blots. */
export function symbolScale(width: number): number {
  return Math.min(1, Math.max(0.62, width / 720));
}

/** A symbol grows only a little as the camera nears it, so it stays engraved (both drawings). */
export function nearness(reference: number, depth: number): number {
  return Math.min(1.5, Math.max(0.8, Math.pow(reference / Math.max(depth, 1), 0.3)));
}
