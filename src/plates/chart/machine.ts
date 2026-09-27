// Plate III's machine layer. Under the loupe, the star beneath the lens is written as the
// machine would write it: a short list of coordinates, then "and thousands more". With
// the machine's view shown in full, a table of the specimen's stars lies on the tissue.

import { STARS, coordinates } from '../../data/chart';
import { spaceMark } from '../../components/marks';

function word(text: string, spaced: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = 'machine__piece';
  if (spaced) el.append(spaceMark());
  el.append(text.replace(/'/g, '’'));
  return el;
}

function numbers(values: string[], className: string): HTMLElement[] {
  return values.map((v) => {
    const n = document.createElement('span');
    n.className = `t-machine ${className}`;
    n.textContent = v;
    return n;
  });
}

export interface ChartMachine {
  /** Write the star under the lens at (x, y) in field px, or clear the lens. */
  near(star: number | null, x: number, y: number): void;
}

/** `pieces` are the specimen's pieces, in order; each distinct star is written once in the table. */
export function createChartMachine(machine: HTMLElement, pieces: readonly { text: string; star: number }[]): ChartMachine {
  const bleed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-bleed')) || 0;

  const table = document.createElement('div');
  table.className = 'machine__table';
  const seen = new Set<number>();
  for (const { text, star } of pieces) {
    if (star < 0 || seen.has(star)) continue;
    seen.add(star);
    const row = document.createElement('div');
    row.className = 'machine__row';
    row.append(word(STARS[star].text, text.startsWith(' ')), ...numbers(coordinates(STARS[star].p), 'machine__coord'));
    table.append(row);
  }

  const lens = document.createElement('div');
  lens.className = 'machine__star';
  machine.replaceChildren(table, lens);

  let current = -1;
  return {
    near(star, x, y) {
      if (star === null) {
        if (current !== -1) lens.replaceChildren();
        current = -1;
        return;
      }
      lens.style.transform = `translate(${(x + bleed).toFixed(1)}px, ${(y + bleed).toFixed(1)}px)`;
      if (star === current) return;
      current = star;
      const s = STARS[star];
      const more = document.createElement('span');
      more.className = 'machine__note';
      more.textContent = 'and thousands more';
      lens.replaceChildren(word(s.text, false), ...numbers(coordinates(s.p), 'machine__coord'), more);
    },
  };
}
