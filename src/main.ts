// The atlas. Phase 1: the foundation only. The frontispiece field is shown developed;
// its load sequence, and every plate's figure, arrive in later phases.

import { boot, fontsReady, startDebug } from './boot';
import { createField } from './gl/background';
import { SEEDS } from './motion/eases';

const flags = boot();

const front = document.querySelector<HTMLElement>('.frontispiece__field');
if (front) {
  createField(front, { seed: SEEDS.frontispiece, angle: -2, strokes: 4, overshoot: 18, bias: 0.7 }, { brush: 1, exposure: 1 });
}

const ready = fontsReady().then(
  () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
);

const TARGETS: Record<string, string> = {
  frontispiece: '#top',
  list: '.contents',
  colophon: '#colophon',
  index: '#index',
};

// Hooks for the screenshot script (always in development, and with ?shots).
if (import.meta.env.DEV || flags.shots) {
  Object.assign(window, {
    __atlas: {
      ready,
      goTo(plate: string | number, progress = 0) {
        const selector = typeof plate === 'number' ? `#plate-${plate}` : TARGETS[plate];
        const el = selector ? document.querySelector<HTMLElement>(selector) : null;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + el.offsetHeight * progress);
      },
    },
  });
}

startDebug(flags);
