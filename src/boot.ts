// Shared start-up for every page: flags, fonts, smooth scroll, the paper, and ?debug.

import './styles/tokens.css';
import './styles/type.css';
import './styles/base.css';
import './styles/components.css';
import './styles/plates.css';

import { FONT_WAIT_MS } from './motion/eases';
import { initScroll } from './motion/scroll';
import { initBackground } from './gl/background';

export interface Flags {
  shots: boolean;
  debug: boolean;
  nogl: boolean;
}

export function readFlags(): Flags {
  const params = new URLSearchParams(location.search);
  return {
    shots: params.has('shots'),
    debug: params.has('debug'),
    nogl: params.has('nogl'),
  };
}

/** Resolves when the fonts are ready, or after 1.5s: the page never waits longer than that. */
export function fontsReady(): Promise<void> {
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

export function boot(): Flags {
  const flags = readFlags();
  // Lenis joins the GSAP ticker first, so the paper is drawn after each scroll step.
  initScroll();
  initBackground({ forceCss: flags.nogl });
  return flags;
}

export function startDebug(flags: Flags): void {
  if (!flags.debug) return;
  void import('./debug/gui').then((m) => m.initDebug());
}
