// The colophon's last line, "Expose the atlas again": back to the top, and the
// frontispiece is printed once more with a fresh brushing.

import { prefersReduced } from '../motion/reduced-motion';
import { jumpToY, scrollToY } from '../motion/scroll';
import { replay } from './frontispiece';

let link: HTMLAnchorElement | null = null;

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
}

export function destroy(): void {
  link?.removeEventListener('click', again);
}
