// Shared start-up for every page: CSS, fonts, smooth scroll, the paper, and ?debug.

import './styles/tokens.css';
import './styles/type.css';
import './styles/base.css';
import './styles/components.css';
import './styles/plates.css';

import { flags, type Flags } from './flags';
import { FONT_WAIT_MS } from './motion/eases';
import { initScroll } from './motion/scroll';
import { initBackground } from './gl/background';

export type { Flags };

/** Resolves when the fonts are ready, or after 1.5s: the page never waits longer than that. */
export function fontsReady(): Promise<void> {
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

/** Two animation frames: long enough for layout and a first render to land. */
export function twoFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export function boot(): Flags {
  const f = flags();
  // Lenis joins the GSAP ticker first, so the paper is drawn after each scroll step.
  initScroll();
  initBackground({ forceCss: f.nogl });
  return f;
}

export function startDebug(f: Flags): void {
  if (!f.debug) return;
  void import('./debug/gui').then((m) => m.initDebug());
}
