// The composing stick, drawn in elevation in paper line, with its sorts; above it, the
// specimen as a miniature row of slips (no letters), and the loop arrows that carry each
// chosen piece back to the end of the sentence. Everything is SVG, so the plate can tone.

import { fleuronPath, loopArrow, sortMark, svgEl, threadCurve } from '../../components/marks';
import { END } from '../../data/specimen';

export interface Loop {
  sort: SVGGElement;
  arrow: SVGPathElement[];
  slip: SVGRectElement | null;
  threads: SVGPathElement[];
}

export interface Stick {
  svg: SVGSVGElement;
  loops: Loop[];
  /** The end mark's sort. */
  end: SVGGElement;
  /** Every element that tones, with its distance from the field's centre (0–1). */
  toning: { el: SVGElement; reach: number }[];
  /** Where each sort sits, for the machine's view. */
  sorts: { piece: string; x: number; y: number; w: number }[];
  height: number;
}

const SPECIMEN = 20;

/** Lay out the stick for a reply. `measure` gives a piece's width as set on a sort's face. */
export function drawStick(width: number, height: number, reply: readonly string[], seed: number, sizes: { slip: number; sort: number }, measure: (text: string) => number): Stick {
  const svg = svgEl('svg', { class: 'stick__art', viewBox: `0 0 ${width} ${height}`, width, height, 'aria-hidden': 'true', focusable: 'false' });
  const toning: Stick['toning'] = [];
  const cx = width / 2;
  const cy = height / 2;
  const far = Math.hypot(cx, cy);
  const tones = <T extends SVGElement>(el: T, x: number, y: number): T => {
    toning.push({ el, reach: Math.hypot(x - cx, y - cy) / far });
    return el;
  };

  // The miniature row: the specimen as small slips, then room for the reply's pieces.
  const slipW = sizes.slip;
  const slipH = Math.round(slipW * 0.64);
  const pitch = slipW + 3;
  const rowY = 58;
  const rowX = Math.max(12, (width - pitch * (SPECIMEN + reply.length)) / 2);
  const miniGroup = svgEl('g', { class: 'stick__mini' }, svg);
  const slotX = (i: number) => rowX + i * pitch;
  for (let i = 0; i < SPECIMEN; i++) {
    tones(svgEl('rect', { x: slotX(i), y: rowY, width: slipW, height: slipH, class: 'mini-slip' }, miniGroup), slotX(i), rowY);
  }

  // The stick: its bed, its back, the head at the left and the knee that closes it at the right.
  const bedY = height - 58;
  const left = 14;
  const right = width - 14;
  const sortH = sizes.sort;
  const line = (d: string, x: number, y: number) => tones(svgEl('path', { d, class: 'stick__line' }, svg), x, y);
  line(`M${left},${bedY} L${right},${bedY + 0.6}`, cx, bedY);
  line(`M${left},${bedY + 7} L${right},${bedY + 7.4}`, cx, bedY + 7);
  line(`M${left},${bedY - sortH - 10} L${left},${bedY + 7} M${left},${bedY - sortH - 10} L${left + 9},${bedY - sortH - 10} L${left + 9},${bedY}`, left, bedY);
  line(`M${right},${bedY - 16} L${right},${bedY + 7}`, right, bedY);

  // The sorts, left to right as they will be set; the end mark's sort last.
  const pieces = [...reply, END];
  const widths = pieces.map((p) => (p === END ? sortH * 0.9 : Math.max(sortH * 0.6, measure(p.replace(/^ /, '').replace(/'/g, '’')) + 16 + (p.startsWith(' ') ? 10 : 0))));
  let x = left + 14;
  const sorts: Stick['sorts'] = [];
  const groups = pieces.map((p, i) => {
    const w = widths[i];
    const g = p === END ? svgEl('g', { class: 'sort sort--end' }) : sortMark(p.replace(/^ /, '').replace(/'/g, '’'), w, sortH, p.startsWith(' '), seed + i);
    if (p === END) {
      svgEl('path', { d: `M0,0 L${w},0 L${w},${sortH} L0,${sortH} Z`, class: 'sort__body' }, g);
      svgEl('path', { d: fleuronPath(sortH * 0.62), class: 'sort__fleuron', transform: `translate(${w / 2} ${sortH * 0.52})` }, g);
    }
    // An outer group holds the sort's place in the stick; the sort itself is free to fall into it.
    const place = svgEl('g', { transform: `translate(${x.toFixed(1)} ${(bedY - sortH).toFixed(1)})` }, svg);
    place.append(g);
    for (const el of g.querySelectorAll<SVGElement>('path, text')) tones(el, x + w / 2, bedY - sortH / 2);
    sorts.push({ piece: p, x, y: bedY - sortH, w });
    x += w + 2;
    return g;
  });

  // Each chosen piece loops back: an arrow from its sort to the next place in the row,
  // a new slip there, and the reading's threads running once more from it.
  const loops: Loop[] = reply.map((_, n) => {
    const s = sorts[n];
    const target = { x: slotX(SPECIMEN + n) + slipW / 2, y: rowY + slipH + 5 };
    const { line: d, head } = loopArrow(s.x + s.w / 2, s.y - 6, target.x, target.y, Math.min(120, (s.y - target.y) * 0.6));
    const arrow = [svgEl('path', { d, class: 'stick__arrow', pathLength: 1 }, svg), svgEl('path', { d: head, class: 'stick__arrow stick__arrow--head', pathLength: 1 }, svg)];
    arrow.forEach((el) => tones(el, (s.x + target.x) / 2, (s.y + target.y) / 2));
    const slip = tones(svgEl('rect', { x: slotX(SPECIMEN + n), y: rowY, width: slipW, height: slipH, class: 'mini-slip mini-slip--new' }, miniGroup), slotX(SPECIMEN + n), rowY);
    // The reading runs again: threads from the new slip back over the row, a quick sweep.
    const from = { x: slotX(SPECIMEN + n) + slipW / 2, y: rowY - 2 };
    const reach = [1, 7, 8, 10, 13, 19, SPECIMEN + n - 1].filter((j, k, all) => j < SPECIMEN + n && all.indexOf(j) === k);
    const threads = reach.map((j) => {
      const to = { x: slotX(j) + slipW / 2, y: rowY - 2 };
      const curve = threadCurve(from, to);
      const pts = Array.from({ length: 21 }, (_, k) => curve(k / 20));
      const top = Math.min(...pts.map((p) => p.y));
      // Keep the sweep within the plate: flatten any arc that would rise off the top.
      const squash = top < 6 ? (rowY - 8) / (rowY - 2 - top) : 1;
      const dd = `M${pts.map((p) => `${p.x.toFixed(1)},${(rowY - 2 - (rowY - 2 - p.y) * squash).toFixed(1)}`).join(' L')}`;
      return tones(svgEl('path', { d: dd, class: 'mini-thread', pathLength: 1 }, miniGroup), (from.x + to.x) / 2, rowY);
    });
    return { sort: groups[n], arrow, slip, threads };
  });

  return { svg, loops, end: groups[groups.length - 1], toning, sorts, height };
}
