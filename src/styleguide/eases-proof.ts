// Proof V: each ease drawn as a curve, with a slip that runs along a track when asked.

import { gsap } from 'gsap';
import { DUR, EASE_JOBS, EASE_NAMES, pen, type EaseName } from '../motion/eases';
import { setPress } from '../motion/verbs';
import { prefersReduced } from '../motion/reduced-motion';
import { svgEl } from '../components/marks';

const W = 250;
const H = 150;
const PAD = { x: 8, top: 18, bottom: 10 };

const RUN_SECONDS: Record<EaseName, (track: number) => number> = {
  brush: () => DUR.brush,
  develop: () => DUR.develop,
  hand: (track) => pen(track),
  settle: () => DUR.settle,
  press: () => DUR.press,
  tone: () => DUR.tone,
};

function curvePath(name: EaseName): string {
  const ease = gsap.parseEase(name);
  const h = H - PAD.top - PAD.bottom;
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const x = PAD.x + t * (W - PAD.x * 2);
    const y = H - PAD.bottom - ease(t) * h;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${pts.join(' L')}`;
}

export function initEases(host: HTMLElement): void {
  for (const name of EASE_NAMES) {
    const fig = document.createElement('figure');
    fig.className = 'ease';

    const svg = svgEl('svg', { class: 'ease__plot', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `The ${name} curve` });
    svgEl('path', { class: 'ease__axis', d: `M${PAD.x},${H - PAD.bottom} H${W - PAD.x} M${PAD.x},${PAD.top} H${W - PAD.x}` }, svg);
    svgEl('path', { class: 'ease__diagonal', d: `M${PAD.x},${H - PAD.bottom} L${W - PAD.x},${PAD.top}` }, svg);
    const curve = svgEl('path', { class: 'ease__curve', d: curvePath(name) }, svg);

    const caption = document.createElement('figcaption');
    const title = document.createElement('p');
    title.className = 'ease__name';
    title.textContent = name;
    const job = document.createElement('p');
    job.className = 'ease__job';
    job.textContent = EASE_JOBS[name];
    caption.append(title, job);

    const track = document.createElement('div');
    track.className = 'ease__track';
    const slip = document.createElement('span');
    slip.className = 'ease__slip';
    slip.textContent = name;
    slip.setAttribute('aria-hidden', 'true');
    track.append(slip);

    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'ink-button';
    run.textContent = `Run ${name}`;
    run.addEventListener('click', () => {
      const distance = track.clientWidth - slip.offsetWidth;
      gsap.killTweensOf(slip);
      if (prefersReduced()) {
        gsap.fromTo(slip, { opacity: 0, x: distance }, { opacity: 1, duration: DUR.crossfade });
        return;
      }
      gsap.set(slip, { x: 0, y: 0 });
      if (name === 'press') {
        setPress(slip, { x: distance }, 'x');
      } else {
        gsap.to(slip, { x: distance, duration: RUN_SECONDS[name](distance), ease: name });
      }
    });

    fig.append(svg, caption, track, run);
    host.append(fig);

    window.addEventListener('atlas:ease', (e) => {
      if ((e as CustomEvent).detail?.name === name) curve.setAttribute('d', curvePath(name));
    });
  }
}
