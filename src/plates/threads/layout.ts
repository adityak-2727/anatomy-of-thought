// Laying the specimen out for reading. On a wide field the twenty pieces lie on a
// shallow smile, so the threads above them have headroom. When the row doesn't fit,
// it stands on end: pieces top to bottom, threads bowing out to the right.

import { signed } from '../../motion/random';

export type Point = { x: number; y: number };

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  turn: number;
}

export interface Row {
  vertical: boolean;
  width: number;
  height: number;
  slots: Slot[];
  /** Where threads meet each piece. */
  anchors: Point[];
  /** Where the needle's point rests over each piece. */
  needle: Point[];
  /** Where each piece's letters begin, for the faint lettering. */
  letters: Point[];
}

const px = (css: CSSStyleDeclaration, name: string) => parseFloat(css.getPropertyValue(name)) || 0;

/** Measure once, then place every piece. `items` are the row's list items, in order. */
export function layRow(stage: HTMLElement, items: HTMLElement[], seed: number): Row {
  const css = getComputedStyle(stage);
  const gap = px(css, '--read-gap');
  const smile = px(css, '--read-smile');
  const pitch = px(css, '--read-pitch');
  const headroom = px(css, '--read-headroom');
  const width = stage.clientWidth;

  // Every read first, then every write: one layout pass.
  const sizes = items.map((li) => {
    const slip = li.querySelector<HTMLElement>('.slip')!;
    const style = getComputedStyle(slip);
    return { w: slip.offsetWidth, h: slip.offsetHeight, pad: parseFloat(style.paddingLeft) || 0 };
  });
  const total = sizes.reduce((sum, s) => sum + s.w, 0) + gap * (items.length - 1);
  const vertical = total > width;

  const slots: Slot[] = [];
  const anchors: Point[] = [];
  const needle: Point[] = [];
  const letters: Point[] = [];
  let height: number;

  if (!vertical) {
    const slipH = Math.max(...sizes.map((s) => s.h));
    let x = (width - total) / 2;
    const half = width / 2;
    sizes.forEach((s, i) => {
      const cx = x + s.w / 2;
      const n = (cx - half) / half;
      // The middle of the row sits lowest; its ends rise, and each piece follows the curve.
      const y = headroom + smile * (1 - n * n);
      const slope = (-2 * smile * n) / half;
      const turn = (Math.atan(slope) * 180) / Math.PI + signed(seed, `turn-${i}`) * 0.4;
      slots.push({ x, y, w: s.w, h: s.h, turn });
      anchors.push({ x: cx, y: y - 3 });
      needle.push({ x: cx, y: y - 6 });
      letters.push({ x: x + s.pad, y: y + s.h / 2 });
      x += s.w + gap;
    });
    height = headroom + smile + slipH;
  } else {
    // Threads meet the pieces along one line just right of the widest, so none crosses a slip.
    const edge = Math.max(...sizes.map((s) => s.w)) + 6;
    sizes.forEach((s, i) => {
      const y = i * pitch;
      const turn = signed(seed, `turn-${i}`) * 0.5;
      slots.push({ x: 0, y, w: s.w, h: s.h, turn });
      anchors.push({ x: edge, y: y + s.h / 2 });
      needle.push({ x: edge + 2, y: y + s.h / 2 });
      letters.push({ x: s.pad, y: y + s.h / 2 });
    });
    height = (items.length - 1) * pitch + Math.max(...sizes.map((s) => s.h));
  }

  items.forEach((li, i) => {
    li.style.left = `${slots[i].x}px`;
    li.style.top = `${slots[i].y}px`;
    li.style.rotate = `${slots[i].turn.toFixed(2)}deg`;
  });
  stage.style.height = `${Math.ceil(height)}px`;
  return { vertical, width, height, slots, anchors, needle, letters };
}
