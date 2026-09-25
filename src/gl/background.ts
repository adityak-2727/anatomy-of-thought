// The paper and its chemistry.
//
// One WebGL2 context and one fragment shader. The fixed, full-viewport canvas shows
// the paper. Each brushed field is drawn by the same shader, then copied into a canvas
// that lives inside the field element, so it scrolls with its own content natively
// (no lag behind the text on touch or native scrolling), and costs nothing while
// the page scrolls unless its state is changing. Renders happen only when something
// changed. Without WebGL2, fields fall back to plain CSS driven by the same variables.

import { gsap } from 'gsap';
import vertSource from './background.vert.glsl?raw';
import fragSource from './background.frag.glsl?raw';
import { raggedClip } from '../components/marks';

export interface FieldState {
  brush: number;
  exposure: number;
  tone: number;
  /** Per-stroke progress for a hand-timed brushing (up to four strokes); null to derive it from `brush`. */
  strokeT: [number, number, number, number] | null;
}

export interface FieldStyle {
  seed: number;
  angle: number;      // degrees; the direction the brush travels
  strokes: number;    // 3 or 4 broad strokes
  overshoot: number;  // px past the rectangle, on average
  bias: number;       // how strongly the centre develops first
}

export interface FieldHandle {
  readonly el: HTMLElement;
  readonly state: FieldState;
  readonly style: FieldStyle;
  /** Call after changing state or style. */
  invalidate(): void;
}

export const PALETTE_TOKENS = [
  '--paper', '--paper-shade', '--prussian-deep', '--prussian', '--prussian-wash',
  '--sensitiser', '--sensitiser-deep', '--tone-umber', '--tone-cream',
] as const;

/** Tunable in ?debug. Values are proportions or CSS px. */
export const tuning = {
  paperFibres: 0.32,
  paperBlotches: 0.55,
  paperGrain: 0.012,
  edgeRoughness: 7,
  streaks: 0.26,
  unevenness: 0.26,
  pockets: 0.3,
};

const FIELD_DEFAULTS: Omit<FieldStyle, 'seed'> = { angle: -3, strokes: 3, overshoot: 14, bias: 0.55 };

interface FieldRecord extends FieldHandle {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  cssW: number;
  cssH: number;
  near: boolean;
  dirty: boolean;
}

type Mode = 'gl' | 'css';

let mode: Mode = 'css';
let gl: WebGL2RenderingContext | null = null;
let paperCanvas: HTMLCanvasElement | null = null;
let program: WebGLProgram | null = null;
const uniforms = new Map<string, WebGLUniformLocation | null>();
const fields = new Set<FieldRecord>();
let paperDirty = true;
const palette = new Float32Array(27);
let bleed = 56;
let paperOffset = (): number => window.scrollY;
let observer: IntersectionObserver | null = null;
let resizer: ResizeObserver | null = null;

function dpr(): number {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
}

function readPalette(): void {
  const css = getComputedStyle(document.documentElement);
  PALETTE_TOKENS.forEach((token, i) => {
    const hex = css.getPropertyValue(token).trim().replace('#', '');
    const n = parseInt(hex, 16);
    palette[i * 3] = ((n >> 16) & 255) / 255;
    palette[i * 3 + 1] = ((n >> 8) & 255) / 255;
    palette[i * 3 + 2] = (n & 255) / 255;
  });
}

function compile(type: number, source: string): WebGLShader {
  const shader = gl!.createShader(type)!;
  gl!.shaderSource(shader, source);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    const log = gl!.getShaderInfoLog(shader);
    gl!.deleteShader(shader);
    throw new Error(`Background shader failed to compile: ${log}`);
  }
  return shader;
}

function setupGL(canvas: HTMLCanvasElement): boolean {
  gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return false;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Background shader failed to link: ${gl.getProgramInfoLog(program)}`);
    }
  } catch (error) {
    console.warn(String(error));
    gl = null;
    return false;
  }
  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());
  for (const name of ['uMode', 'uResolution', 'uScale', 'uPalette', 'uPaperOffset', 'uPaperTune', 'uRect', 'uState', 'uStyle', 'uTune', 'uStrokeT', 'uExplicit']) {
    uniforms.set(name, gl.getUniformLocation(program, name));
  }
  return true;
}

function u(name: string): WebGLUniformLocation | null {
  return uniforms.get(name) ?? null;
}

function sizePaper(): void {
  if (!paperCanvas) return;
  const scale = dpr();
  const w = Math.max(1, Math.round(paperCanvas.clientWidth * scale));
  const h = Math.max(1, Math.round(paperCanvas.clientHeight * scale));
  if (paperCanvas.width !== w || paperCanvas.height !== h) {
    paperCanvas.width = w;
    paperCanvas.height = h;
  }
  paperDirty = true;
  for (const f of fields) f.dirty = true;
}

function drawPaper(): void {
  if (!gl || !paperCanvas) return;
  gl.viewport(0, 0, paperCanvas.width, paperCanvas.height);
  gl.uniform1i(u('uMode'), 0);
  gl.uniform2f(u('uResolution'), paperCanvas.width, paperCanvas.height);
  gl.uniform1f(u('uScale'), dpr());
  gl.uniform2f(u('uPaperOffset'), 0, paperOffset());
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawField(f: FieldRecord): void {
  if (!gl || !paperCanvas || !f.canvas || !f.ctx) return;
  const { state, style } = f;
  const strokes = state.strokeT;
  const empty = strokes ? Math.max(...strokes) <= 0 : state.brush <= 0;
  f.ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
  if (empty) return;

  // A field larger than the drawing buffer is rendered at a reduced scale.
  const scale = Math.min(dpr(), paperCanvas.width / f.cssW, paperCanvas.height / f.cssH);
  const w = Math.max(1, Math.floor(f.cssW * scale));
  const h = Math.max(1, Math.floor(f.cssH * scale));
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(u('uMode'), 1);
  gl.uniform2f(u('uResolution'), w, h);
  gl.uniform1f(u('uScale'), scale);
  gl.uniform4f(u('uRect'), bleed, bleed, f.cssW - bleed * 2, f.cssH - bleed * 2);
  gl.uniform4f(u('uState'), state.brush, state.exposure, state.tone, style.seed);
  gl.uniform4f(u('uStyle'), (style.angle * Math.PI) / 180, style.strokes, style.overshoot, style.bias);
  gl.uniform4f(u('uStrokeT'), ...(strokes ?? [0, 0, 0, 0]));
  gl.uniform1f(u('uExplicit'), strokes ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // The drawing buffer is still valid within this task, so the copy is synchronous.
  f.ctx.drawImage(paperCanvas, 0, paperCanvas.height - h, w, h, 0, 0, f.canvas.width, f.canvas.height);
}

function frame(): void {
  if (mode !== 'gl' || !gl) return;
  let drewField = false;
  for (const f of fields) {
    if (f.dirty && f.near) {
      f.dirty = false;
      drawField(f);
      drewField = true;
    }
  }
  // A field pass borrows the paper canvas, so the paper is always redrawn after one.
  if (paperDirty || drewField) {
    paperDirty = false;
    drawPaper();
  }
}

function sizeFieldCanvas(f: FieldRecord): void {
  if (!f.canvas) return;
  const scale = dpr();
  f.cssW = f.el.clientWidth + bleed * 2;
  f.cssH = f.el.clientHeight + bleed * 2;
  const w = f.near ? Math.max(1, Math.round(f.cssW * scale)) : 1;
  const h = f.near ? Math.max(1, Math.round(f.cssH * scale)) : 1;
  if (f.canvas.width !== w || f.canvas.height !== h) {
    f.canvas.width = w;
    f.canvas.height = h;
  }
  f.dirty = true;
}

function writeCssState(f: FieldRecord): void {
  const s = f.el.style;
  s.setProperty('--brush', f.state.brush.toFixed(3));
  s.setProperty('--exposure', f.state.exposure.toFixed(3));
  s.setProperty('--tone', f.state.tone.toFixed(3));
}

/** Register an element as a brushed field. Safe to call before or after initBackground. */
export function createField(el: HTMLElement, style: Partial<FieldStyle> & { seed: number }, state?: Partial<FieldState>): FieldHandle {
  const record: FieldRecord = {
    el,
    state: { brush: 0, exposure: 0, tone: 0, strokeT: null, ...state },
    style: { ...FIELD_DEFAULTS, ...style },
    canvas: null,
    ctx: null,
    cssW: 0,
    cssH: 0,
    near: false,
    dirty: true,
    invalidate() {
      if (mode === 'css') writeCssState(record);
      record.dirty = true;
    },
  };
  fields.add(record);
  attach(record);
  return record;
}

function attach(f: FieldRecord): void {
  f.el.style.setProperty('--field-clip', raggedClip(f.style.seed));
  if (mode === 'css') {
    writeCssState(f);
    return;
  }
  if (!f.canvas) {
    f.canvas = document.createElement('canvas');
    f.canvas.className = 'field__canvas';
    f.canvas.setAttribute('aria-hidden', 'true');
    f.el.prepend(f.canvas);
    f.ctx = f.canvas.getContext('2d');
  }
  observer?.observe(f.el);
  resizer?.observe(f.el);
}

/** Start the background. Returns the mode in use. */
export function initBackground(options: { forceCss?: boolean } = {}): Mode {
  bleed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-bleed')) || bleed;
  readPalette();

  paperCanvas = document.querySelector<HTMLCanvasElement>('canvas.paper');
  // From here the chemistry decides how fields look (the CSS safety net stands down).
  document.documentElement.classList.add('bg-ready');
  if (!options.forceCss && paperCanvas && setupGL(paperCanvas)) {
    mode = 'gl';
  } else {
    mode = 'css';
    document.documentElement.classList.add('no-gl');
    for (const f of fields) attach(f);
    return mode;
  }

  applyTuning();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const f = [...fields].find((x) => x.el === entry.target);
        if (!f) continue;
        f.near = entry.isIntersecting;
        sizeFieldCanvas(f);
      }
    },
    { rootMargin: '60% 0px 60% 0px' },
  );
  resizer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === paperCanvas) {
        sizePaper();
        continue;
      }
      const f = [...fields].find((x) => x.el === entry.target);
      if (f) sizeFieldCanvas(f);
    }
  });
  resizer.observe(paperCanvas!);
  for (const f of fields) attach(f);

  paperCanvas!.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fallBackToCss();
  });
  window.addEventListener('scroll', () => (paperDirty = true), { passive: true });
  sizePaper();
  // Added after Lenis, so the paper is drawn with this frame's scroll position.
  gsap.ticker.add(frame);
  return mode;
}

function fallBackToCss(): void {
  mode = 'css';
  gsap.ticker.remove(frame);
  document.documentElement.classList.add('no-gl');
  for (const f of fields) {
    f.canvas?.remove();
    f.canvas = null;
    f.ctx = null;
    writeCssState(f);
  }
}

function applyTuning(): void {
  if (!gl) return;
  gl.uniform3fv(u('uPalette'), palette);
  gl.uniform3f(u('uPaperTune'), tuning.paperFibres, tuning.paperBlotches, tuning.paperGrain);
  gl.uniform4f(u('uTune'), tuning.edgeRoughness, tuning.streaks, tuning.unevenness, tuning.pockets);
}

/** Re-read the palette tokens and tuning (used by ?debug). */
export function refreshBackground(): void {
  readPalette();
  applyTuning();
  paperDirty = true;
  for (const f of fields) f.invalidate();
}

/** Let the scroll module hold the paper still while a plate is pinned. */
export function setPaperOffset(fn: () => number): void {
  paperOffset = fn;
  paperDirty = true;
}

export function backgroundMode(): Mode {
  return mode;
}

export function allFields(): FieldHandle[] {
  return [...fields];
}
