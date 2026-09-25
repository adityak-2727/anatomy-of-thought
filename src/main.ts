// The atlas. The first screen (frontispiece, list of plates) is in this bundle; plate code
// loads once the frontispiece has had its moment, or as soon as the reader heads down.

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot, fontsReady, startDebug, twoFrames } from './boot';
import * as frontispiece from './plates/frontispiece';
import * as listOfPlates from './plates/list-of-plates';
import * as colophon from './plates/colophon';
import { loadAllPlates, plate } from './plates/registry';
import { FRONT } from './motion/eases';
import { prefersReduced } from './motion/reduced-motion';
import { jumpToY } from './motion/scroll';

const f = boot();

frontispiece.init(document.querySelector<HTMLElement>('.frontispiece')!);
listOfPlates.init(document.querySelector<HTMLElement>('.contents')!);
colophon.init(document.querySelector<HTMLElement>('.colophon')!);

/** After the frontispiece has printed, when the browser has a moment to spare. */
function afterFrontispiece(): Promise<void> {
  const wait = (FRONT.hintAt + FRONT.print) * 1000;
  return new Promise((resolve) =>
    setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(() => resolve()) : resolve()), wait),
  );
}

// If the reader skips ahead, the plates load as the list of plates approaches.
const plates = document.getElementById('plates');
if (plates) {
  const near = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      near.disconnect();
      void loadAllPlates();
    }
  }, { rootMargin: '25% 0px' });
  near.observe(plates);
}

const ready = (async () => {
  await fontsReady();
  ScrollTrigger.refresh();
  if (prefersReduced()) frontispiece.developed();
  else frontispiece.begin({ play: !f.shots && window.scrollY < 4 });
  if (!f.shots) await afterFrontispiece();
  await loadAllPlates();
  await twoFrames();
})();

const SECTIONS: Record<string, string> = {
  list: '.contents',
  colophon: '#colophon',
  index: '#index',
};

// Hooks for the screenshot script (always in development, and with ?shots).
if (import.meta.env.DEV || f.shots) {
  Object.assign(window, {
    __atlas: {
      ready,
      /**
       * Jump to a checkpoint. For a plate, progress runs 0–1 over its pinned stretch;
       * negative values reach back into its approach, in screen heights.
       */
      async goTo(target: string | number, progress = 0) {
        await ready;
        if (target === 'frontispiece') {
          jumpToY(0);
          if (!prefersReduced()) frontispiece.seek(progress);
        } else if (typeof target === 'number') {
          await loadAllPlates();
          const r = plate(target)?.range();
          const section = document.getElementById(`plate-${target}`);
          const top = section ? section.getBoundingClientRect().top + window.scrollY : 0;
          const y = r ? (progress >= 0 ? r.start + progress * (r.end - r.start) : r.start + progress * window.innerHeight) : top;
          jumpToY(y);
        } else {
          const el = document.querySelector<HTMLElement>(SECTIONS[target] ?? '');
          if (el) jumpToY(el.getBoundingClientRect().top + window.scrollY);
        }
        await twoFrames();
      },
    },
  });
}

startDebug(f);
