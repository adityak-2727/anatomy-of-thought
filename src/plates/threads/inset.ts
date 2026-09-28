// Fig. 4b: a small corner of Plate III's chart, projected through the same camera maths
// (lib/projection.ts), so its stars sit where the big chart puts them. A faint ring marks
// where the first "it" stays: it cannot see ahead. A mark stands for the machine's sense
// of "it" as the reading goes on, and drifts from The Crowded Centre towards the answer:
// trophy, or (in the variant) suitcase, between suit and case.

import { gsap } from 'gsap';
import { CHART_FOV, STARS, starFor } from '../../data/chart';
import type { Variant } from '../../data/specimen';
import { svgEl } from '../../components/marks';
import { PLATE4 } from '../../motion/eases';
import { projector, type Pose, type Vec3 } from '../../lib/projection';

/** How far the mark goes towards its answer: close to it, not on it. */
const SHARE = 0.82;
/** The chart's neighbours of the words that matter, drawn as plain dots for their company. */
const COMPANY = ['the', 'a', 'of', 'too', "'s", 'because', 'medal', 'cup', 'prize', 'box', 'bag', 'trunk', 'coat', 'shirt'];
const NAMED = ['trophy', 'suit', 'case'] as const;
const FILL = 0.62;

type Point = { x: number; y: number };

export interface Inset {
  layout(): void;
  /** 0 at the first big, 1 by the question mark. */
  setDrift(d: number): void;
  setVariant(variant: Variant, animate: boolean): void;
}

const at = (word: string): Vec3 => STARS[starFor(word)].p;

/** A camera looking at `points`, stepped back until they fill the inset. */
function frame(points: Vec3[], width: number, height: number): Pose {
  const target = [0, 1, 2].map((k) => points.reduce((s, p) => s + p[k], 0) / points.length) as unknown as Vec3;
  let back = 200;
  let pose: Pose = { position: [target[0], target[1], target[2] + back], target };
  for (let i = 0; i < 5; i++) {
    pose = { position: [target[0], target[1], target[2] + back], target };
    const project = projector({ pose, fov: CHART_FOV, width, height });
    let reach = 0;
    for (const p of points) {
      const q = project(p);
      reach = Math.max(reach, Math.abs(q.x / width - 0.5) * 2, Math.abs(q.y / height - 0.5) * 2);
    }
    back *= reach / FILL;
  }
  return pose;
}

export function createInset(el: HTMLElement, variant: Variant): Inset {
  const svg = svgEl('svg', { class: 'inset__chart', 'aria-hidden': 'true', focusable: 'false' });
  el.append(svg);
  let drift = 0;
  let current: Variant = variant;
  const toward = { x: 0, y: 0 };
  let from: Point = { x: 0, y: 0 };
  let answers: Record<Variant, Point> = { big: { x: 0, y: 0 }, small: { x: 0, y: 0 } };
  let mark: SVGGElement | null = null;
  let trail: SVGLineElement | null = null;

  const place = () => {
    if (!mark || !trail) return;
    const k = SHARE * drift;
    const x = from.x + (toward.x - from.x) * k;
    const y = from.y + (toward.y - from.y) * k;
    mark.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    trail.setAttribute('x2', x.toFixed(1));
    trail.setAttribute('y2', y.toFixed(1));
    mark.style.opacity = drift > 0.001 ? '1' : '0';
    trail.style.opacity = drift > 0.001 ? '' : '0';
  };

  return {
    layout() {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (!width || !height) return;
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const pose = frame([at('it'), at('trophy'), at('suit'), at('case')], width, height);
      const project = projector({ pose, fov: CHART_FOV, width, height });
      const flat = (word: string): Point => {
        const p = project(at(word));
        return { x: p.x, y: p.y };
      };

      svgEl('rect', { x: 0.5, y: 0.5, width: width - 1, height: height - 1, class: 'inset__frame' }, svg);
      for (const word of COMPANY) {
        const p = flat(word);
        if (p.x < 4 || p.x > width - 4 || p.y < 4 || p.y > height - 4) continue;
        svgEl('circle', { cx: p.x, cy: p.y, r: 1.3, class: 'inset__dot' }, svg);
      }
      const label = (p: Point, text: string, dx: number, dy: number, anchor: 'start' | 'end' = 'start') => {
        const t = svgEl('text', { x: p.x + dx, y: p.y + dy, class: 'inset__label', 'text-anchor': anchor }, svg);
        t.textContent = text;
      };
      for (const word of NAMED) {
        const p = flat(word);
        svgEl('circle', { cx: p.x, cy: p.y, r: 2.4, class: 'inset__star' }, svg);
        // Labels stand clear of the mark's path: trophy above, suit and case to their right.
        label(p, word, 6, word === 'suit' ? 16 : -6);
      }

      // Where the first "it" stays, a faint ring; the mark sets out from it.
      from = flat('it');
      svgEl('circle', { cx: from.x, cy: from.y, r: 6, class: 'inset__ring' }, svg);
      label(from, 'it', -9, 5, 'end');
      const suit = flat('suit');
      const kase = flat('case');
      answers = { big: flat('trophy'), small: { x: (suit.x + kase.x) / 2, y: (suit.y + kase.y) / 2 } };
      Object.assign(toward, answers[current]);
      trail = svgEl('line', { x1: from.x, y1: from.y, x2: from.x, y2: from.y, class: 'inset__trail' }, svg);
      mark = svgEl('g', { class: 'inset__mark' }, svg);
      svgEl('circle', { r: 3.4 }, mark);
      svgEl('circle', { r: 6.5, class: 'inset__mark-ring' }, mark);
      place();
    },

    setDrift(d: number) {
      drift = Math.min(1, Math.max(0, d));
      place();
    },

    setVariant(variant: Variant, animate: boolean) {
      current = variant;
      const to = answers[variant];
      gsap.killTweensOf(toward);
      if (animate) gsap.to(toward, { x: to.x, y: to.y, duration: PLATE4.inset, ease: 'settle', onUpdate: place });
      else {
        Object.assign(toward, to);
        place();
      }
    },
  };
}
