// The chart in three.js: loaded only when the reader comes within a screen of Plate III.
// It must look printed, not rendered: engraved symbols with hard antialiased edges in
// paper-white, hairline threads, normal blending, no glow, no bloom, no depth blur.

import {
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { STARS } from '../../data/chart';
import { rayTurn } from './geometry';
import { SYMBOL_SIZE, chartInk, symbolScale, type ChartData, type ChartRenderer, type Look } from './renderer';
import type { Vec3 } from '../../lib/projection';

const STAR_VERT = /* glsl */ `
attribute float aMag;
attribute float aThreshold;
attribute float aOwn;
attribute float aTurn;
uniform float uReveal;
uniform float uDpr;
uniform float uRef;
uniform float uSymbol;
uniform float uSizes[7];
varying float vAlpha;
varying float vMag;
varying float vSize;
varying float vScale;
varying float vTurn;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float general = clamp((uReveal - aThreshold) / 0.06, 0.0, 1.0);
  float a = max(general, aOwn);
  // Only lightly smaller with distance, so a symbol stays engraved up close.
  float near = clamp(pow(uRef / max(-mv.z, 1.0), 0.3), 0.8, 1.5);
  float scale = near * mix(0.6, 1.0, a) * uSymbol;
  float size = uSizes[int(aMag)] * scale;
  vAlpha = a;
  vMag = aMag;
  vSize = size;
  vScale = scale;
  vTurn = aTurn;
  gl_PointSize = size * uDpr;
}
`;

// Measured in CSS px from the symbol's centre, at its stated size; the whole symbol
// scales with the sprite. Every edge is a hard edge, softened by about one device pixel
// for antialiasing, never more.
const STAR_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uDpr;
varying float vAlpha;
varying float vMag;
varying float vSize;
varying float vScale;
varying float vTurn;

float edge(float d, float halfWidth) {
  float aa = 0.6 / (uDpr * vScale);
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, d);
}

float rays(vec2 q, float r, float count, float from, float longTo, float shortTo, float width) {
  float sector = 6.2831853 / count;
  float a = atan(q.y, q.x) + vTurn;
  float k = floor(a / sector + 0.5);
  float da = a - k * sector;
  float across = abs(sin(da)) * r;
  float to = mod(k, 2.0) < 0.5 ? longTo : shortTo;
  float along = smoothstep(from - 0.4, from + 0.4, r) * (1.0 - smoothstep(to - 0.6, to + 0.2, r));
  return edge(across, width) * along * step(abs(da), 1.2);
}

void main() {
  if (vAlpha < 0.004) discard;
  vec2 q = (gl_PointCoord - 0.5) * vSize / vScale;
  float r = length(q);
  float m = vMag;
  float ink;
  if (m < 1.5) {
    ink = max(edge(r, 2.8), edge(abs(r - 5.4), 0.4));
    ink = max(ink, rays(q, r, 8.0, 7.2, 12.6, 9.6, 0.42));
  } else if (m < 2.5) {
    ink = max(edge(r, 2.3), edge(abs(r - 4.5), 0.38));
    ink = max(ink, rays(q, r, 8.0, 6.1, 10.2, 7.9, 0.4));
  } else if (m < 3.5) {
    ink = max(edge(r, 1.9), rays(q, r, 4.0, 3.2, 6.3, 6.3, 0.38));
  } else if (m < 4.5) {
    ink = max(edge(r, 1.6), rays(q, r, 4.0, 2.8, 4.8, 4.8, 0.36));
  } else if (m < 5.5) {
    ink = edge(r, 1.3);
  } else {
    ink = edge(r, 1.0);
  }
  float alpha = ink * vAlpha;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const LINE_VERT = /* glsl */ `
attribute float aTime;
varying float vTime;
void main() {
  vTime = aTime;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const LINE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDraw;
varying float vTime;
void main() {
  if (vTime > uDraw || uOpacity < 0.004) discard;
  gl_FragColor = vec4(uColor, uOpacity);
}
`;

function segments(polylines: { points: readonly Vec3[]; times?: readonly number[] }[]): BufferGeometry {
  const positions: number[] = [];
  const times: number[] = [];
  for (const line of polylines) {
    for (let i = 0; i < line.points.length - 1; i++) {
      positions.push(...line.points[i], ...line.points[i + 1]);
      times.push(line.times?.[i] ?? 0, line.times?.[i + 1] ?? 0);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('aTime', new BufferAttribute(new Float32Array(times), 1));
  return g;
}

/** Build the chart in `host`. Returns null if WebGL is refused, so the plate can fall back to SVG. */
export function createGlChart(host: HTMLElement, data: ChartData): ChartRenderer | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  const canvas = renderer.domElement;
  canvas.className = 'chart__canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', host.dataset.label ?? '');
  host.append(canvas);

  const ink = chartInk();
  const colour = new Vector3(...ink.paper);
  // As the fields: 1.5 device pixels to the CSS pixel is fine enough for engraved stars, and
  // at 2x the chart and the fields together left the GPU behind as the plate arrived.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 1, 2000);

  // The threads, then the stars over them. (The graticule behind them went in the Phase 8
  // restraint pass: the ruled border already says this is a chart of the sky.)
  const lineMat = new ShaderMaterial({
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: { uColor: { value: colour }, uOpacity: { value: ink.line }, uDraw: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const lines = new LineSegments(segments(data.lines), lineMat);
  lines.renderOrder = 1;
  scene.add(lines);

  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(new Float32Array(STARS.flatMap((s) => [...s.p])), 3));
  starGeo.setAttribute('aMag', new BufferAttribute(new Float32Array(STARS.map((s) => s.mag)), 1));
  starGeo.setAttribute('aThreshold', new BufferAttribute(data.thresholds, 1));
  starGeo.setAttribute('aTurn', new BufferAttribute(new Float32Array(STARS.map((_, i) => rayTurn(data.seed, i))), 1));
  const own = new BufferAttribute(new Float32Array(STARS.length), 1);
  starGeo.setAttribute('aOwn', own);
  const starMat = new ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uColor: { value: colour },
      uReveal: { value: 0 },
      uDpr: { value: dpr },
      uRef: { value: 1 },
      uSymbol: { value: 1 },
      uSizes: { value: SYMBOL_SIZE },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const stars = new Points(starGeo, starMat);
  stars.renderOrder = 2;
  stars.frustumCulled = false;
  scene.add(stars);

  let width = 0;
  let height = 0;
  // Compiled in the background where the browser can: asked for at the first render, the
  // result held the page for about 90ms, mid-scroll, as the chart came near (Phase 8).
  // (Where the browser cannot compile in the background, three.js would only warn and wait.)
  const ready = renderer.extensions.has('KHR_parallel_shader_compile')
    ? renderer.compileAsync(scene, camera).then(
        () => undefined,
        () => undefined,
      )
    : Promise.resolve();

  return {
    kind: 'gl',
    ready,
    render(look: Look) {
      const { view } = look;
      if (view.width !== width || view.height !== height) {
        width = view.width;
        height = view.height;
        renderer.setSize(width, height, false);
      }
      camera.fov = view.fov;
      camera.aspect = width / height;
      camera.position.set(...view.pose.position);
      camera.up.set(0, 1, 0);
      camera.lookAt(...view.pose.target);
      camera.updateProjectionMatrix();
      starMat.uniforms.uReveal.value = look.reveal;
      starMat.uniforms.uRef.value = look.reference;
      starMat.uniforms.uSymbol.value = symbolScale(view.width);
      (own.array as Float32Array).set(look.own);
      own.needsUpdate = true;
      lineMat.uniforms.uDraw.value = look.draw;
      renderer.render(scene, camera);
    },
    destroy() {
      for (const o of [lines, stars]) {
        o.geometry.dispose();
        (o.material as ShaderMaterial).dispose();
      }
      renderer.dispose();
      canvas.remove();
    },
  };
}
