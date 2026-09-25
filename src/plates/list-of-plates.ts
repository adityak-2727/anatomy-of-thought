// The list of plates: each title, a dotted leader, its numeral. On hover or focus the
// leader's dots darken from left to right in a quick stagger; a click carries the reader
// to the plate and hands it focus. The address bar's hash is left alone (it holds #small).

import { gsap } from 'gsap';
import { svgEl } from '../components/marks';
import { LIST, SEEDS, jitterStagger } from '../motion/eases';
import { prefersReduced } from '../motion/reduced-motion';
import { rand } from '../motion/random';
import { jumpToY, scrollToY } from '../motion/scroll';
import { loadAllPlates, plate } from './registry';

const SEED = SEEDS.frontispiece;
/** Room left above a heading when the reader arrives at it, in px. */
const HEADROOM = 32;

interface Leader {
  host: HTMLElement;
  ink: SVGCircleElement[];
}

let leaders: Leader[] = [];
let resizer: ResizeObserver | null = null;
const cleanups: (() => void)[] = [];

export function init(root: HTMLElement): void {
  const entries = [...root.querySelectorAll<HTMLAnchorElement>('.contents__entry')];
  const css = getComputedStyle(document.documentElement);
  const gap = parseFloat(css.getPropertyValue('--leader-gap')) || 9;
  const dot = parseFloat(css.getPropertyValue('--leader-dot')) || 1.1;

  const draw = () => {
    const widths = leaders.map((l) => l.host.clientWidth);
    leaders.forEach((l, i) => dots(l, widths[i], gap, dot, i));
  };

  leaders = entries
    .map((entry) => entry.querySelector<HTMLElement>('.contents__leader'))
    .filter((host): host is HTMLElement => !!host)
    .map((host) => ({ host, ink: [] }));
  draw();
  resizer = new ResizeObserver(draw);
  resizer.observe(root);

  for (const entry of entries) {
    const leader = leaders.find((l) => entry.contains(l.host));
    const darken = () => {
      if (!leader) return;
      gsap.killTweensOf(leader.ink);
      if (prefersReduced()) {
        gsap.to(leader.ink, { opacity: 1, duration: LIST.dot });
        return;
      }
      gsap.to(leader.ink, {
        opacity: 1,
        duration: LIST.dot,
        ease: 'press',
        stagger: jitterStagger(LIST.dotStagger, SEED, 'dots'),
      });
    };
    const lighten = () => {
      if (!leader) return;
      gsap.killTweensOf(leader.ink);
      gsap.to(leader.ink, { opacity: 0, duration: LIST.undo });
    };
    const go = (event: MouseEvent) => {
      const id = entry.getAttribute('href');
      const target = id ? document.querySelector<HTMLElement>(id) : null;
      if (!target) return;
      event.preventDefault();
      void travel(target);
    };
    entry.addEventListener('pointerenter', darken);
    entry.addEventListener('focus', darken);
    entry.addEventListener('pointerleave', lighten);
    entry.addEventListener('blur', lighten);
    entry.addEventListener('click', go);
    cleanups.push(() => {
      entry.removeEventListener('pointerenter', darken);
      entry.removeEventListener('focus', darken);
      entry.removeEventListener('pointerleave', lighten);
      entry.removeEventListener('blur', lighten);
      entry.removeEventListener('click', go);
    });
  }
}

export function destroy(): void {
  resizer?.disconnect();
  cleanups.splice(0).forEach((c) => c());
}

/** Two rows of dots: faint ones always, and ink ones above them that appear on hover. */
function dots(leader: Leader, width: number, gap: number, r: number, row: number): void {
  const count = Math.max(0, Math.floor(width / gap));
  const svg = svgEl('svg', { class: 'leader-dots', width, height: 6, viewBox: `0 0 ${width} 6`, 'aria-hidden': 'true', focusable: 'false' });
  const wash = svgEl('g', { class: 'leader-dots__wash' }, svg);
  const ink = svgEl('g', { class: 'leader-dots__ink' }, svg);
  // Dots set by hand sit a hair off the grid; the last one ends flush with the leader.
  const offset = width - count * gap;
  for (let i = 0; i < count; i++) {
    const cx = offset + i * gap + gap / 2 + (rand(SEED, `x-${row}-${i}`) - 0.5) * 0.7;
    const cy = 3 + (rand(SEED, `y-${row}-${i}`) - 0.5) * 0.5;
    svgEl('circle', { cx: cx.toFixed(2), cy: cy.toFixed(2), r }, wash);
    svgEl('circle', { cx: cx.toFixed(2), cy: cy.toFixed(2), r, opacity: 0 }, ink);
  }
  leader.host.replaceChildren(svg);
  leader.ink = [...ink.querySelectorAll('circle')];
}

/**
 * Glide to a plate, then hand it focus. On wide screens that is the start of its pinned
 * stretch, where it stands composed; in one column the pin begins with the figure
 * centred, below the heading, so the reader lands with the heading in view instead.
 */
async function travel(target: HTMLElement): Promise<void> {
  await loadAllPlates();
  const n = /^plate-(\d)$/.exec(target.id)?.[1];
  const range = n ? plate(Number(n))?.range() : null;
  const heading = target.querySelector<HTMLElement>('h2');
  const headingY = (heading ?? target).getBoundingClientRect().top + window.scrollY - HEADROOM;
  const y = range ? Math.min(range.start, headingY) : target.getBoundingClientRect().top + window.scrollY;
  const arrive = () => heading?.focus({ preventScroll: true });
  if (prefersReduced()) {
    jumpToY(y);
    arrive();
    return;
  }
  scrollToY(y, arrive);
}
