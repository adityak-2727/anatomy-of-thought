// The paper and its chemistry.
//
// One WebGL2 context and one fragment shader, drawing into a hidden scratch canvas:
// - The paper is baked once into a seamless tile and laid as the page's own background,
//   so it scrolls with the text natively and costs nothing per frame.
// - Each brushed field is drawn by the same shader and copied into a canvas inside the
//   field element, so it moves with its content exactly (no lag on touch or native
//   scrolling). A field is redrawn only when its state changes: a quick draft while it
//   animates, then one sharp pass once it has been still for a moment.
// Without WebGL2, fields fall back to plain CSS driven by the same variables.
//
// The shader is built twice, once for each pass (the paper, the fields), so that each is only
// the half it needs, and the two are compiled side by side in the background where the browser
// can (KHR_parallel_shader_compile). On Windows, Direct3D took three seconds over the whole
// shader on a first visit, and asking for the result at once froze the page for all of that
// time (Phase 8). Until the fields' pass is ready they wait, blank, and the page scrolls;
// `backgroundReady()` says when. The paper's tile is baked whenever its own pass is ready.

import { gsap } from 'gsap';
import vertSource from './background.vert.glsl?raw';
import fragSource from './background.frag.glsl?raw';
import { raggedClip } from '../components/marks';
import { DUR } from '../motion/eases';

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
  /** Needs drawing. */
  dirty: boolean;
  /** The pending draw answers an animation, so a draft will do. */
  moving: boolean;
  /** The last draw was at full resolution. */
  sharp: boolean;
  lastChange: number;
  /** When the field was last drawn, on the ticker's clock. */
  lastDraw: number;
}

type Mode = 'gl' | 'css';

let mode: Mode = 'css';
let gl: WebGL2RenderingContext | null = null;
let scratch: HTMLCanvasElement | null = null;

/** One compiled pass of the shader: the paper's, or the fields'. */
interface Pass {
  program: WebGLProgram;
  shaders: WebGLShader[];
  uniforms: Map<string, WebGLUniformLocation | null>;
  /** Linked and ready to draw with. */
  linked: boolean;
}

const UNIFORMS = ['uResolution', 'uScale', 'uPalette', 'uPaperTune', 'uRect', 'uState', 'uStyle', 'uTune', 'uStrokeT', 'uExplicit'];
let paperPass: Pass | null = null;
let fieldPass: Pass | null = null;
let current: Pass | null = null;
let settle: () => void = () => {};
const ready = new Promise<void>((resolve) => (settle = resolve));
const fields = new Set<FieldRecord>();
const palette = new Float32Array(27);
let bleed = 56;
let tileSize = 1024;
let tileUrl = '';
let observer: IntersectionObserver | null = null;
let resizer: ResizeObserver | null = null;
/** When the page last scrolled, on the ticker's clock. */
let lastScroll = 0;

/**
 * The density fields are drawn at. A brushed field is a soft texture, and the text on it is
 * real text, so 1.5 device pixels to the CSS pixel is as fine as it needs: at 2x the shader
 * had four times the pixels to fill, and plates stuttered as they arrived (Phase 8).
 */
function dpr(): number {
  return Math.min(window.devicePixelRatio || 1, 1.5);
}

/**
 * While a field changes it is drawn as a draft: at 60% of a CSS pixel, and at most thirty
 * times a second. Plate IV's field is some 900,000 pixels at full size, and the shader works
 * about fifty noise values for each; drawn so every frame, it held the GPU for up to 83ms
 * as a plate arrived (Phase 8). The sharp pass follows once the page is still.
 */
function draftScale(): number {
  return Math.min(dpr(), 1) * 0.6;
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

/** Hand one pass's shaders to the driver and link, without asking how it went (that would wait). */
function startPass(define: string): Pass {
  const program = gl!.createProgram()!;
  const source = fragSource.replace('#version 300 es', `#version 300 es\n#define ${define}`);
  const shaders = [
    [gl!.VERTEX_SHADER, vertSource],
    [gl!.FRAGMENT_SHADER, source],
  ].map(([type, text]) => {
    const shader = gl!.createShader(type as number)!;
    gl!.shaderSource(shader, text as string);
    gl!.compileShader(shader);
    gl!.attachShader(program, shader);
    return shader;
  });
  gl!.linkProgram(program);
  return { program, shaders, uniforms: new Map(), linked: false };
}

function startGL(canvas: HTMLCanvasElement): boolean {
  gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return false;
  gl.bindVertexArray(gl.createVertexArray());
  // The fields first: the title page waits on them.
  fieldPass = startPass('PASS_FIELD');
  paperPass = startPass('PASS_PAPER');
  return true;
}

/** The driver has finished a pass: check the result, and make it ready to draw with. */
function finishPass(pass: Pass): boolean {
  if (!gl) return false;
  if (!gl.getProgramParameter(pass.program, gl.LINK_STATUS)) {
    const logs = pass.shaders.map((sh) => gl!.getShaderInfoLog(sh)).filter(Boolean).join(' ');
    console.warn(`Background shader failed: ${gl.getProgramInfoLog(pass.program)} ${logs}`);
    return false;
  }
  pass.linked = true;
  for (const name of UNIFORMS) pass.uniforms.set(name, gl.getUniformLocation(pass.program, name));
  applyTuning(pass);
  return true;
}

function use(pass: Pass): void {
  if (current === pass) return;
  gl!.useProgram(pass.program);
  current = pass;
}

function u(name: string): WebGLUniformLocation | null {
  return current?.uniforms.get(name) ?? null;
}

/**
 * The scratch canvas only ever grows, and with room to spare: reallocating its drawing
 * buffer takes tens of milliseconds, so it must not happen a few pixels at a time, mid-scroll.
 */
function ensureScratch(w: number, h: number): void {
  if (!scratch) return;
  if (scratch.width < w) scratch.width = Math.ceil(w * 1.25);
  if (scratch.height < h) scratch.height = Math.ceil(h * 1.25);
}

/** Bake the paper into a seamless tile and lay it as the page's background. */
function bakePaper(): void {
  if (!gl || !scratch || !paperPass?.linked) return;
  use(paperPass);
  const scale = dpr();
  const size = Math.round(tileSize * scale);
  ensureScratch(size, size);
  gl.viewport(0, 0, size, size);
  gl.uniform2f(u('uResolution'), size, size);
  gl.uniform1f(u('uScale'), scale);
  gl.uniform4f(u('uRect'), 0, 0, tileSize, tileSize);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // Copy within this task, while the drawing buffer is still valid.
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  tile.getContext('2d')!.drawImage(scratch, 0, scratch.height - size, size, size, 0, 0, size, size);
  tile.toBlob((blob) => {
    if (!blob) return;
    const previous = tileUrl;
    tileUrl = URL.createObjectURL(blob);
    document.documentElement.style.setProperty('--paper-tile-image', `url("${tileUrl}")`);
    if (previous) URL.revokeObjectURL(previous);
  });
}

function drawField(f: FieldRecord, scaleWanted: number): void {
  if (!gl || !scratch || !f.canvas || !f.ctx) return;
  const { state, style } = f;
  const strokes = state.strokeT;
  const empty = strokes ? Math.max(...strokes) <= 0 : state.brush <= 0;
  f.ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
  if (empty) return;

  const w = Math.max(1, Math.floor(f.cssW * scaleWanted));
  const h = Math.max(1, Math.floor(f.cssH * scaleWanted));
  ensureScratch(w, h);
  use(fieldPass!);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(u('uResolution'), w, h);
  gl.uniform1f(u('uScale'), scaleWanted);
  gl.uniform4f(u('uRect'), bleed, bleed, f.cssW - bleed * 2, f.cssH - bleed * 2);
  gl.uniform4f(u('uState'), state.brush, state.exposure, state.tone, style.seed);
  gl.uniform4f(u('uStyle'), (style.angle * Math.PI) / 180, style.strokes, style.overshoot, style.bias);
  gl.uniform4f(u('uStrokeT'), ...(strokes ?? [0, 0, 0, 0]));
  gl.uniform1f(u('uExplicit'), strokes ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // The drawing buffer is still valid within this task, so the copy is synchronous.
  f.ctx.drawImage(scratch, 0, scratch.height - h, w, h, 0, 0, f.canvas.width, f.canvas.height);
}

function frame(time: number): void {
  if (mode !== 'gl' || !gl || !fieldPass?.linked) return;
  for (const f of fields) {
    if (!f.near) continue;
    if (f.dirty) {
      // A change arriving hard on the last draft waits a frame; the page scrolls on meanwhile.
      if (f.moving && time - f.lastDraw < DUR.draftEvery) continue;
      f.lastDraw = time;
      const scale = f.moving ? draftScale() : dpr();
      drawField(f, scale);
      f.sharp = scale >= dpr();
      f.dirty = false;
      f.moving = false;
      f.lastChange = time;
    } else if (!f.sharp && time - f.lastChange > DUR.refine && time - lastScroll > DUR.refineIdle) {
      // Still for a moment, and the page too: now draw it properly. (Drawn mid-scroll, this
      // full-resolution pass is the one frame the GPU cannot fit, and a plate stuttered.)
      drawField(f, dpr());
      f.sharp = true;
    }
  }
}

function sizeFieldCanvas(f: FieldRecord): void {
  if (!f.canvas) return;
  const scale = dpr();
  f.cssW = f.el.clientWidth + bleed * 2;
  f.cssH = f.el.clientHeight + bleed * 2;
  // Grow the scratch canvas as each field is measured, not on the field's first draw.
  ensureScratch(Math.round(f.cssW * scale), Math.round(f.cssH * scale));
  const w = f.near ? Math.max(1, Math.round(f.cssW * scale)) : 1;
  const h = f.near ? Math.max(1, Math.round(f.cssH * scale)) : 1;
  if (f.canvas.width !== w || f.canvas.height !== h) {
    f.canvas.width = w;
    f.canvas.height = h;
  }
  // A draft first, like any change: a field coming into range mid-scroll is refined once the
  // page is still, not drawn at full resolution while it moves.
  f.dirty = true;
  f.moving = true;
}

function writeCssState(f: FieldRecord): void {
  const s = f.el.style;
  s.setProperty('--brush', f.state.brush.toFixed(3));
  s.setProperty('--exposure', f.state.exposure.toFixed(3));
  s.setProperty('--tone', f.state.tone.toFixed(3));
}

/**
 * Move a field's brushing and exposure forward, never back: what the machine has
 * processed stays processed. Redraws only when something actually changed, so
 * scrolling to and fro over a finished field costs nothing.
 */
export function advanceField(field: FieldHandle, to: { brush?: number; exposure?: number }): void {
  const brush = Math.max(field.state.brush, to.brush ?? 0);
  const exposure = Math.max(field.state.exposure, to.exposure ?? 0);
  if (brush === field.state.brush && exposure === field.state.exposure) return;
  field.state.brush = brush;
  field.state.exposure = exposure;
  field.invalidate();
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
    moving: false,
    sharp: false,
    lastChange: 0,
    lastDraw: 0,
    invalidate() {
      if (mode === 'css') writeCssState(record);
      record.dirty = true;
      record.moving = true;
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
  const css = getComputedStyle(document.documentElement);
  bleed = parseFloat(css.getPropertyValue('--field-bleed')) || bleed;
  tileSize = parseFloat(css.getPropertyValue('--paper-tile-size')) || tileSize;
  readPalette();

  scratch = document.querySelector<HTMLCanvasElement>('canvas.paper');
  // From here the chemistry decides how fields look (the CSS safety net stands down).
  document.documentElement.classList.add('bg-ready');
  if (!options.forceCss && scratch && startGL(scratch)) {
    mode = 'gl';
    // Room at the start for a field the size of the screen: growing it later, as Plate IV
    // came near, held a scroll for 90ms (Phase 8).
    ensureScratch(Math.round((window.innerWidth + bleed * 2) * dpr()), Math.round((window.innerHeight + bleed * 2) * dpr()));
  } else {
    mode = 'css';
    document.documentElement.classList.add('no-gl');
    for (const f of fields) attach(f);
    settle();
    return mode;
  }

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
      const f = [...fields].find((x) => x.el === entry.target);
      if (f) sizeFieldCanvas(f);
    }
  });
  for (const f of fields) attach(f);

  scratch!.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fallBackToCss();
  });
  // A move between screens of different density needs a sharper (or lighter) tile.
  window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', bakePaper, { once: true });
  gsap.ticker.add(frame);
  window.addEventListener('scroll', () => (lastScroll = gsap.ticker.time), { passive: true });
  whenCompiled();
  return mode;
}

/** Wait for the driver without blocking the page, where the browser allows it. */
function whenCompiled(): void {
  const parallel = gl?.getExtension('KHR_parallel_shader_compile');
  const fieldsDone = () => {
    if (fieldPass && finishPass(fieldPass)) {
      for (const f of fields) {
        f.dirty = true;
        f.moving = false;
      }
    } else {
      fallBackToCss();
    }
    settle();
  };
  // Without its tile the page is plain paper, which is all it would lose.
  const paperDone = () => {
    if (paperPass && finishPass(paperPass)) bakePaper();
    else paperPass = null;
  };
  if (!parallel || !gl) {
    fieldsDone();
    if (mode === 'gl') paperDone();
    return;
  }
  const started = performance.now();
  const compiled = (pass: Pass | null) => !!gl && !!pass && gl.getProgramParameter(pass.program, parallel.COMPLETION_STATUS_KHR);
  const poll = () => {
    if (mode !== 'gl' || !gl) {
      gsap.ticker.remove(poll);
      return;
    }
    if (fieldPass && !fieldPass.linked && compiled(fieldPass)) fieldsDone();
    if (paperPass && !paperPass.linked && compiled(paperPass)) paperDone();
    const fieldsWaiting = mode === 'gl' && !!fieldPass && !fieldPass.linked;
    const paperWaiting = mode === 'gl' && !!paperPass && !paperPass.linked;
    if (fieldsWaiting && performance.now() - started > DUR.compileWait * 1000) {
      // A driver this slow would make a poor printing press: plain CSS fields instead.
      gsap.ticker.remove(poll);
      fallBackToCss();
      settle();
    } else if (!fieldsWaiting && !paperWaiting) {
      gsap.ticker.remove(poll);
    }
  };
  gsap.ticker.add(poll);
}

/** Resolves once the fields can be drawn (or have fallen back to CSS). */
export function backgroundReady(): Promise<void> {
  return ready;
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

function applyTuning(pass: Pass | null): void {
  if (!gl || !pass?.linked) return;
  use(pass);
  gl.uniform3fv(u('uPalette'), palette);
  gl.uniform3f(u('uPaperTune'), tuning.paperFibres, tuning.paperBlotches, tuning.paperGrain);
  gl.uniform4f(u('uTune'), tuning.edgeRoughness, tuning.streaks, tuning.unevenness, tuning.pockets);
}

/** Re-read the palette tokens and tuning (used by ?debug). */
export function refreshBackground(): void {
  readPalette();
  applyTuning(fieldPass);
  applyTuning(paperPass);
  bakePaper();
  for (const f of fields) {
    f.dirty = true;
    f.moving = false;
  }
}

export function backgroundMode(): Mode {
  return mode;
}

export function allFields(): FieldHandle[] {
  return [...fields];
}
