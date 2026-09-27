// The chart in SVG, for when WebGL is refused or three.js arrives too late. It projects
// the same stars through the same camera as the three.js drawing (lib/projection.ts),
// so the lettered names, the rings and the hand-off land in the same places.

import { STARS } from '../../data/chart';
import { svgEl } from '../../components/marks';
import { projector, type Vec3 } from '../../lib/projection';
import { rayTurn } from './geometry';
import { nearness, symbolScale, type ChartData, type ChartRenderer, type Look } from './renderer';

/** The engraved symbol for each magnitude, in CSS px about its centre (as scene.ts draws it). */
function symbol(defs: SVGDefsElement, mag: number): void {
  const g = svgEl('symbol', { id: `chart-m${mag}`, viewBox: '-14 -14 28 28', width: 28, height: 28, overflow: 'visible' }, defs);
  const dot = [0, 2.8, 2.3, 1.9, 1.6, 1.3, 1.0][mag];
  svgEl('circle', { r: dot, class: 'chart-svg__dot' }, g);
  if (mag <= 2) svgEl('circle', { r: mag === 1 ? 5.4 : 4.5, class: 'chart-svg__ring' }, g);
  if (mag <= 4) {
    const count = mag <= 2 ? 8 : 4;
    const [from, long, short] = [
      [0, 0, 0],
      [7.2, 12.6, 9.6],
      [6.1, 10.2, 7.9],
      [3.2, 6.3, 6.3],
      [2.8, 4.8, 4.8],
    ][mag];
    let d = '';
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      const to = k % 2 === 0 ? long : short;
      d += `M${(Math.cos(a) * from).toFixed(2)},${(Math.sin(a) * from).toFixed(2)} L${(Math.cos(a) * to).toFixed(2)},${(Math.sin(a) * to).toFixed(2)} `;
    }
    svgEl('path', { d, class: 'chart-svg__rays' }, g);
  }
}

export function createSvgChart(host: HTMLElement, data: ChartData): ChartRenderer {
  const svg = svgEl('svg', { class: 'chart__svg', role: 'img', 'aria-labelledby': 'chart-svg-title chart-svg-desc' });
  svgEl('title', { id: 'chart-svg-title' }, svg).textContent = host.dataset.label ?? '';
  svgEl('desc', { id: 'chart-svg-desc' }, svg).textContent = host.dataset.description ?? '';
  const defs = svgEl('defs', {}, svg);
  for (let m = 1; m <= 6; m++) symbol(defs, m);

  const graticule = svgEl('g', { class: 'chart-svg__graticule' }, svg);
  const gratPaths = data.graticule.map(() => svgEl('path', {}, graticule));
  const lineGroup = svgEl('g', { class: 'chart-svg__lines' }, svg);
  const linePaths = data.lines.map(() => svgEl('path', { pathLength: 1 }, lineGroup));
  const starGroup = svgEl('g', { class: 'chart-svg__stars' }, svg);
  const uses = STARS.map((s) => svgEl('use', { href: `#chart-m${s.mag}`, width: 28, height: 28 }, starGroup));
  const turns = STARS.map((_, i) => (rayTurn(data.seed, i) * 180) / Math.PI);
  host.append(svg);

  const pathOf = (points: readonly Vec3[], project: ReturnType<typeof projector>) => {
    let d = '';
    let pen = false;
    for (const point of points) {
      const p = project(point);
      if (p.depth <= 1) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  let lastPose = '';
  return {
    kind: 'svg',
    render(look: Look) {
      const { view } = look;
      const project = projector(view);
      const poseKey = `${view.pose.position.join()}|${view.pose.target.join()}|${view.width}|${view.height}`;
      const moved = poseKey !== lastPose;
      lastPose = poseKey;
      if (moved) svg.setAttribute('viewBox', `0 0 ${view.width} ${view.height}`);

      graticule.style.opacity = String(look.graticule);
      if (moved) data.graticule.forEach((pts, i) => gratPaths[i].setAttribute('d', pathOf(pts, project)));

      data.lines.forEach((line, i) => {
        const path = linePaths[i];
        const t0 = line.times[0];
        const t1 = line.times[line.times.length - 1];
        const t = Math.min(1, Math.max(0, (look.draw - t0) / (t1 - t0 || 1)));
        if (t <= 0) {
          path.style.display = 'none';
          return;
        }
        path.style.display = '';
        if (moved || !path.getAttribute('d')) path.setAttribute('d', pathOf(line.points, project));
        path.style.strokeDasharray = `${t} 1`;
      });

      STARS.forEach((s, i) => {
        const general = Math.min(1, Math.max(0, (look.reveal - data.thresholds[i]) / 0.06));
        const a = Math.max(general, look.own[i]);
        const use = uses[i];
        const p = project(s.p);
        if (a < 0.004 || p.depth <= 1) {
          use.style.display = 'none';
          return;
        }
        use.style.display = '';
        const scale = nearness(look.reference, p.depth) * (0.6 + 0.4 * a) * symbolScale(view.width);
        use.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${turns[i].toFixed(1)}) scale(${scale.toFixed(3)}) translate(-14 -14)`);
        use.style.opacity = a.toFixed(3);
      });
    },
    destroy() {
      svg.remove();
    },
  };
}
