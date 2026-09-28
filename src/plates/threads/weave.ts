// One piece's threads: laid cotton from the piece back to each earlier piece it weighs,
// wider for more weight, a second ply from 0.3. On a phone's upright row the same
// threads are worked out lying down, then turned to bow out to the right.

import { svgEl, threadCurve, threadFibres, threadPaths } from '../../components/marks';
import type { Point, Row } from './layout';

/** Threads lighter than this are not drawn (DESIGN-PLAN §6). */
export const LIGHTEST = 0.03;
/** From this weight a thread is laid double, so dominance reads within the 2px rule. */
export const DOUBLE = 0.3;

export const threadWidth = (w: number) => 0.5 + 1.5 * Math.sqrt(w);

export interface Strand {
  el: SVGPathElement;
  /** Its length as a share of the group's longest: the pen reaches its end at that share. */
  share: number;
}

export interface Group {
  g: SVGGElement;
  strands: Strand[];
  /** Each thread's weight, and where the machine writes it: on the thread, near the piece it reaches. */
  labels: { to: number; w: number; at: Point }[];
}

// Upright row: work in a frame where the column lies along x, then turn back.
const lieDown = (p: Point): Point => ({ x: p.y, y: -p.x });
const standUp = (p: Point): Point => ({ x: -p.y, y: p.x });

/** Piece `i`'s threads, from `row` (its weights over every piece), laid over `layout`. */
export function weave(i: number, weights: readonly number[], layout: Row, seed: number): Group {
  const g = svgEl('g', { class: 'thread-group' });
  const strands: { el: SVGPathElement; length: number }[] = [];
  const labels: Group['labels'] = [];
  const turn = layout.vertical ? lieDown : (p: Point) => p;
  const back = layout.vertical ? standUp : (p: Point) => p;
  const from = turn(layout.anchors[i]);

  for (let j = 0; j < i; j++) {
    const w = weights[j];
    if (w < LIGHTEST) continue;
    const to = turn(layout.anchors[j]);
    const s = seed + i * 31 + j;
    const width = threadWidth(w).toFixed(2);
    const length = Math.abs(to.x - from.x) * 1.3 + 12;
    for (const d of threadPaths(from, to, s, w >= DOUBLE ? 2 : 1, back)) {
      strands.push({ el: svgEl('path', { d, class: 'thread', 'stroke-width': width, pathLength: 1 }, g), length });
    }
    // Stray fibres leave the thread and rejoin it: that is what makes it read as cotton.
    for (const d of threadFibres(from, to, s, w >= DOUBLE ? 3 : 2, back)) {
      strands.push({ el: svgEl('path', { d, class: 'thread thread--fuzz', pathLength: 1 }, g), length });
    }
    labels.push({ to: j, w, at: back(threadCurve(from, to)(0.8)) });
  }

  const longest = Math.max(1, ...strands.map((s) => s.length));
  return { g, strands: strands.map((s) => ({ el: s.el, share: s.length / longest })), labels };
}

/** Draw a group to `t` (0–1 of its pen time): each strand grows at the same speed. */
export function drawTo(group: Group, t: number): void {
  for (const s of group.strands) {
    const f = Math.min(1, Math.max(0, t / s.share));
    s.el.style.strokeDasharray = f >= 1 ? '' : `${f.toFixed(4)} 2`;
    s.el.style.visibility = f <= 0 ? 'hidden' : '';
  }
}
