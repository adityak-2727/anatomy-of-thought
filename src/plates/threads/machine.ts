// Plate IV's machine layer: the pieces as outlines, the current piece's threads as plain
// ink lines, and each thread's weight written on it as the machine writes it. The piece's
// weight on itself is written beneath it.

import { svgEl, threadCurve } from '../../components/marks';
import type { Row } from './layout';
import type { Group } from './weave';

/** Room a written weight takes, in px, so neighbours can step aside. */
const WEIGHT_BOX = { w: 34, h: 18 };

const lieDown = (p: { x: number; y: number }) => ({ x: p.y, y: -p.x });
const standUp = (p: { x: number; y: number }) => ({ x: -p.y, y: p.x });

/** Rewrite the machine layer for piece `i`. `offset` is the stage's corner within the machine layer. */
export function writeThreadsMachine(
  machine: HTMLElement,
  layout: Row,
  offset: { x: number; y: number },
  texts: readonly string[],
  i: number,
  group: Group | null,
  self: number,
): void {
  const svg = svgEl('svg', { class: 'machine__threads', 'aria-hidden': 'true', focusable: 'false' });
  const g = svgEl('g', { transform: `translate(${offset.x.toFixed(1)} ${offset.y.toFixed(1)})` }, svg);
  layout.slots.forEach((s, k) => {
    svgEl('rect', { x: s.x, y: s.y, width: s.w, height: s.h, class: k === i ? 'machine__slot machine__slot--now' : 'machine__slot' }, g);
    const t = svgEl('text', { x: s.x + s.w / 2, y: s.y + s.h / 2, class: 'machine__slot-text', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    t.textContent = texts[k].replace(/^ /, '').replace(/'/g, '’');
  });
  if (group) {
    const turn = layout.vertical ? lieDown : (p: { x: number; y: number }) => p;
    const back = layout.vertical ? standUp : (p: { x: number; y: number }) => p;
    const from = turn(layout.anchors[i]);
    const placed: { x: number; y: number }[] = [];
    for (const label of group.labels) {
      const curve = threadCurve(from, turn(layout.anchors[label.to]));
      const pts = Array.from({ length: 25 }, (_, n) => back(curve(n / 24)));
      svgEl('path', { d: `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}`, class: 'machine__thread' }, g);
      // Where two weights would touch, the later one steps aside (up, or out on an upright row).
      let { x, y } = { x: label.at.x, y: label.at.y - 4 };
      for (let n = 0; n < 4 && placed.some((p) => Math.abs(p.x - x) < WEIGHT_BOX.w && Math.abs(p.y - y) < WEIGHT_BOX.h); n++) {
        if (layout.vertical) x += WEIGHT_BOX.w;
        else y -= WEIGHT_BOX.h;
      }
      placed.push({ x, y });
      const w = svgEl('text', { x, y, class: 'machine__weight', 'text-anchor': 'middle' }, g);
      w.textContent = label.w.toFixed(2);
    }
  }
  const s = layout.slots[i];
  const own = svgEl('text', {
    x: s.x + s.w / 2 + (layout.vertical ? s.w / 2 + 34 : 0),
    y: layout.vertical ? s.y + s.h / 2 + 7 : s.y + s.h + 24,
    class: 'machine__weight',
    'text-anchor': 'middle',
  }, g);
  own.textContent = self.toFixed(2);
  machine.replaceChildren(svg);
}
