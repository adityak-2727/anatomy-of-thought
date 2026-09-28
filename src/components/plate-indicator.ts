// The plate indicator: a small slip at the bottom left saying which plate the reader is
// in ("Plate III of VI"). It follows the plate that crosses the middle of the screen,
// crossfades when that changes, and goes away over the frontispiece, the list of plates,
// the colophon and the index. It repeats the headings, so it is hidden from screen readers.

import { gsap } from 'gsap';
import { DUR } from '../motion/eases';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

let observer: IntersectionObserver | null = null;

export function init(): void {
  const plates = [...document.querySelectorAll<HTMLElement>('section.plate[id^="plate-"]')];
  if (!plates.length) return;
  const slip = document.createElement('p');
  slip.className = 'plate-indicator';
  slip.setAttribute('aria-hidden', 'true');
  // Two faces, so one label can give way to the next.
  const faces = [document.createElement('span'), document.createElement('span')];
  for (const face of faces) face.className = 'plate-indicator__face';
  slip.append(...faces);
  document.body.append(slip);

  let front = 0;
  let current = -1;
  const inView = new Set<number>();

  const show = (n: number) => {
    if (n === current) return;
    const was = current;
    current = n;
    if (n < 0) {
      gsap.to(slip, { autoAlpha: 0, duration: DUR.crossfade, ease: 'none' });
      return;
    }
    const next = faces[1 - front];
    next.textContent = `Plate ${NUMERALS[n]} of VI`;
    if (was < 0) {
      // Coming back from the end matter or the front: the slip simply appears with its label.
      gsap.set(faces[front], { autoAlpha: 0 });
      gsap.set(next, { autoAlpha: 1 });
      gsap.to(slip, { autoAlpha: 1, duration: DUR.crossfade, ease: 'none' });
    } else {
      gsap.to(faces[front], { autoAlpha: 0, duration: DUR.crossfade, ease: 'none' });
      gsap.to(next, { autoAlpha: 1, duration: DUR.crossfade, ease: 'none' });
    }
    front = 1 - front;
  };

  gsap.set(slip, { autoAlpha: 0 });
  gsap.set(faces, { autoAlpha: 0 });

  // A plate is current while it crosses the line through the middle of the screen.
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const n = plates.indexOf(e.target as HTMLElement);
        if (e.isIntersecting) inView.add(n);
        else inView.delete(n);
      }
      show(inView.size ? Math.max(...inView) : -1);
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  for (const p of plates) observer.observe(p);
}

export function destroy(): void {
  observer?.disconnect();
  observer = null;
}
