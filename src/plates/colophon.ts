// The end matter. The colophon's last line, "Expose the atlas again": back to the top,
// and the frontispiece is printed once more with a fresh brushing. The index's terms carry
// the reader to their plates as the list of plates does, leaving #small in the address.

import { prefersReduced } from '../motion/reduced-motion';
import { jumpToY, scrollToY } from '../motion/scroll';
import { replay } from './frontispiece';
import { travel } from './list-of-plates';

let link: HTMLAnchorElement | null = null;
let terms: HTMLAnchorElement[] = [];

const toPlate = (event: MouseEvent) => {
  const href = (event.currentTarget as HTMLAnchorElement).getAttribute('href');
  const target = href ? document.querySelector<HTMLElement>(href) : null;
  if (!target) return;
  event.preventDefault();
  void travel(target);
};

const again = (event: MouseEvent) => {
  event.preventDefault();
  const title = document.querySelector<HTMLElement>('h1');
  if (prefersReduced()) {
    jumpToY(0);
    title?.focus({ preventScroll: true });
    return;
  }
  scrollToY(0, () => {
    replay();
    title?.focus({ preventScroll: true });
  });
};

export function init(root: HTMLElement): void {
  link = root.querySelector<HTMLAnchorElement>('[data-replay]');
  link?.addEventListener('click', again);
  terms = [...document.querySelectorAll<HTMLAnchorElement>('.index a[href^="#plate-"]')];
  for (const term of terms) term.addEventListener('click', toPlate);
}

export function destroy(): void {
  link?.removeEventListener('click', again);
  for (const term of terms) term.removeEventListener('click', toPlate);
}
