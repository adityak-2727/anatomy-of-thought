import { describe, expect, it } from 'vitest';
import { CHART_FOV, LINES, STARS, STOP_ORDER, coordinates, extent, magnitude, overviewFor, poseFor, starFor } from './chart';
import { projector } from '../lib/projection';
import { CONSTELLATIONS } from './vocab';
import { PIECES, REPLY } from './specimen';
import html from '../../index.html?raw';

const at = (word: string) => STARS.find((s) => s.text === word)!;
const gap = (a: string, b: string) => Math.hypot(...([0, 1, 2] as const).map((k) => at(a).p[k] - at(b).p[k]));

describe('the stars', () => {
  it('gives every word on the chart a star, with a place and a magnitude of 1 to 6', () => {
    const words = CONSTELLATIONS.reduce((n, c) => n + c.words.length, 0);
    expect(STARS).toHaveLength(words);
    for (const s of STARS) {
      expect(s.p.every(Number.isFinite)).toBe(true);
      expect(s.mag).toBeGreaterThanOrEqual(1);
      expect(s.mag).toBeLessThanOrEqual(6);
    }
  });

  it('makes common words bright and rare ones faint', () => {
    expect(magnitude('the')).toBe(1);
    expect(magnitude('because')).toBeLessThan(magnitude('lightning'));
  });

  it('keeps each constellation together', () => {
    for (const c of CONSTELLATIONS) {
      const { radius } = extent(c.id);
      expect(radius).toBeLessThan(34);
    }
  });

  it('puts pairs used in the same places close together', () => {
    expect(gap('big', 'small')).toBeLessThan(4);
    expect(gap('hot', 'cold')).toBeLessThan(4);
    expect(gap('up', 'down')).toBeLessThan(4);
  });

  it('puts trophy among medal, cup and prize, and case among box, bag and trunk', () => {
    for (const w of ['medal', 'cup', 'prize']) expect(gap('trophy', w)).toBeLessThan(8);
    for (const w of ['box', 'bag', 'trunk']) expect(gap('case', w)).toBeLessThan(8);
  });

  it('keeps no two stars on top of each other', () => {
    for (let i = 0; i < STARS.length; i++) {
      for (let j = i + 1; j < STARS.length; j++) {
        const d = Math.hypot(...([0, 1, 2] as const).map((k) => STARS[i].p[k] - STARS[j].p[k]));
        expect(d).toBeGreaterThan(0.8);
      }
    }
  });

  it('finds a star for every piece of the specimens and replies', () => {
    for (const piece of [...PIECES.big, ...PIECES.small, ...REPLY.big, ...REPLY.small]) expect(starFor(piece)).toBeGreaterThanOrEqual(0);
  });

  it('gives The and the separate stars, as they are separate pieces', () => {
    expect(starFor('The')).not.toBe(starFor(' the'));
  });
});

describe('the lines', () => {
  it('draws 5 to 12 lines in each constellation, never between two', () => {
    for (const c of CONSTELLATIONS) {
      const own = LINES.filter(([a]) => STARS[a].constellation === c.id);
      expect(own.length).toBeGreaterThanOrEqual(5);
      expect(own.length).toBeLessThanOrEqual(12);
    }
    for (const [a, b] of LINES) expect(STARS[a].constellation).toBe(STARS[b].constellation);
  });
});

describe('the camera', () => {
  it('visits the five stops of BRIEF §6, in order', () => {
    expect(STOP_ORDER).toEqual(['laurel', 'chest', 'wardrobe', 'rule', 'centre']);
  });

  it('stands in front of each stop, looking at it', () => {
    for (const id of STOP_ORDER) {
      const pose = poseFor(id);
      expect(pose.position[2]).toBeGreaterThan(pose.target[2]);
    }
  });

  it('stands back far enough to see every star in a wide field and a square one, clear of the foot', () => {
    for (const [width, height, band] of [[800, 600, 0], [360, 360, 0], [800, 600, 68], [350, 420, 68]]) {
      const project = projector({ pose: overviewFor(width, height, band), fov: CHART_FOV, width, height });
      for (const s of STARS) {
        const p = project(s.p);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(height - band);
      }
    }
  });
});

describe('the page', () => {
  it('lists every constellation and its words for readers of the text alternative', () => {
    const names = [...html.matchAll(/<h3 class="star-list__name">([^<]+)<\/h3>/g)].map((m) => m[1]);
    expect(names).toEqual([...CONSTELLATIONS.map((c) => c.name), 'The Uncharted']);
    const lists = [...html.matchAll(/<p class="star-list__words">([^<]+)\.<\/p>/g)].map((m) => m[1].split(', '));
    const spoken: Record<string, string> = { 'full stop': '.', comma: ',', 'question mark': '?', 'exclamation mark': '!' };
    expect(lists.map((words) => words.map((w) => spoken[w] ?? w.replace(/’/g, "'")))).toEqual(CONSTELLATIONS.map((c) => [...c.words]));
  });

  it('writes the same coordinates into the page as the chart holds', () => {
    const written = [...html.matchAll(/<td data-at>([^<]+)<\/td>/g)].map((m) => m[1]);
    const stars = [...new Set(PIECES.big.map(starFor))];
    expect(written).toEqual(stars.flatMap((i) => coordinates(STARS[i].p)));
  });

  it('gives each of the five stops its caption', () => {
    const stops = [...html.matchAll(/data-stop="([a-z]+)"/g)].map((m) => m[1]);
    expect(stops).toEqual([...STOP_ORDER]);
  });
});
