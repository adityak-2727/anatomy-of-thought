// Plate III. A chart of meaning. The twenty pieces rise from their rows and hand off to
// their stars; the chart develops, its threads are drawn and its constellations lettered;
// the camera visits five stops, each with its caption, and comes to rest at The Crowded
// Centre. At rest the chart may be turned a little, and toured by its names.
//
// three.js is imported only when the reader comes within a screen of the plate. If WebGL
// is refused, or three.js hasn't arrived by the time the pin is 5% through, the same
// chart is drawn in SVG for the rest of the visit.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, backgroundMode, createField } from '../gl/background';
import { initLoupe } from '../components/loupe';
import { CHART_CENTRE, CHART_FOV, STARS, STOP_ORDER, STOP_WORDS, overviewFor, poseFor, starFor } from '../data/chart';
import { CONSTELLATIONS } from '../data/vocab';
import { PIECES } from '../data/specimen';
import { DUR, PINS, PIN_DROP, PLATE3, SEEDS } from '../motion/eases';
import { COMPACT, REDUCED, WIDE, isPhone } from '../motion/media';
import { scrollToY, scrubFor, travelTime } from '../motion/scroll';
import { flags } from '../flags';
import { signed } from '../motion/random';
import { developOnArrival } from '../motion/verbs';
import { getState, subscribe } from '../state';
import { along, basis, between, distance, orbit, projector, pxPerUnit, type Pose, type View } from '../lib/projection';
import { lay, pieceItem, prepare, toFinal } from './dissect';
import { constellationLines, graticule, specimenStars, thresholds } from './chart/geometry';
import { createOverlay, type Frame } from './chart/overlay';
import { createChartMachine } from './chart/machine';
import { createSvgChart } from './chart/svg-chart';
import type { ChartData, ChartRenderer } from './chart/renderer';

gsap.registerPlugin(ScrollTrigger);

const span = (r: readonly [number, number]) => r[1] - r[0];
const GRATICULE_RADIUS = 175;
/** The pin's share at which three.js must have arrived, or the SVG chart takes over. */
const LATE = 0.05;

let mm: gsap.MatchMedia | null = null;
let held: ScrollTrigger | null = null;
let teardown: (() => void) | null = null;

export function init(root: HTMLElement): void {
  const frameEl = root.querySelector<HTMLElement>('.plate__frame')!;
  const pinned = root.querySelector<HTMLElement>('.plate__pinned')!;
  const fieldEl = root.querySelector<HTMLElement>('.chart-field')!;
  const host = fieldEl.querySelector<HTMLElement>('.chart')!;
  const stage = fieldEl.querySelector<HTMLElement>('.chart__stage')!;
  const list = fieldEl.querySelector<HTMLElement>('.chart__pieces')!;
  const overlayEl = fieldEl.querySelector<HTMLElement>('.chart__overlay')!;
  const machineEl = fieldEl.querySelector<HTMLElement>('.machine')!;
  const stopsEl = root.querySelector<HTMLElement>('.chart-stops')!;
  const captions = [...stopsEl.querySelectorAll<HTMLElement>('.chart-stop')];
  const intro = root.querySelector<HTMLElement>('.plate__intro');
  const note = root.querySelector<HTMLElement>('.chart-uncharted');
  const listYours = root.querySelector<HTMLElement>('.star-list__yours');
  const listUncharted = root.querySelector<HTMLElement>('[data-uncharted]');
  const uncharted0 = listUncharted?.textContent ?? '';
  const seed = SEEDS.plates[2];
  const shots = flags().shots;

  const field = createField(fieldEl, { seed, angle: 88, strokes: 4, overshoot: 18, bias: 0.5 });
  const proxy = { brush: 0, exposure: 0 };
  const latch = () => advanceField(field, proxy);

  // The pieces, as Plate II left them: laid in loose rows and pinned. Their numbers stay
  // behind on Plate II; here each piece is about to be given a place instead.
  const texts = PIECES.big;
  list.replaceChildren(...texts.map((t) => pieceItem(t)));
  const pieces = prepare(list, seed);
  const starOf = texts.map(starFor);
  const own = specimenStars(texts);

  const data: ChartData = {
    seed,
    thresholds: thresholds(seed, own),
    lines: constellationLines(seed),
    graticule: graticule(CHART_CENTRE, GRATICULE_RADIUS),
  };
  const overlay = createOverlay(overlayEl, seed);
  const machine = createChartMachine(machineEl, texts.map((text, i) => ({ text, star: starOf[i] })));
  initLoupe(fieldEl);

  // ─── What the chart shows, all in one place ───────────────────────────────
  const look = { reveal: 0, draw: 0, graticule: 0, own: new Float32Array(STARS.length) };
  const story = { s: 0, rings: 0, border: 0 };
  const handed = pieces.map(() => ({ v: 0 }));
  const lettering = CONSTELLATIONS.map(() => ({ v: 0 }));
  const lettered = new Float32Array(CONSTELLATIONS.length);
  const redraw = { v: 1 };
  let frame: Frame = { width: 0, height: 0, band: 0 };
  let stops: Pose[] = [];
  let reference = 300;
  let restProgress = 1;
  let atRest = false;
  let still = false;
  let override: { id: string; pose: Pose } | null = null;
  let fly: { id: string; from: Pose; to: Pose; t: number } | null = null;
  let flyTween: gsap.core.Tween | null = null;
  const drag = { yaw: 0, pitch: 0, toYaw: 0, toPitch: 0 };
  let dragging: { x: number; y: number; yaw: number; pitch: number } | null = null;
  const pointer = { x: 0, y: 0, inside: false, moved: false };
  const cache = new Float32Array(STARS.length * 3);
  let caption = -2;
  let lensStar: number | null = null;
  let renderer: ChartRenderer | null = null;
  let settled = false;
  let loading = false;
  let grace = 0;
  let visible = false;
  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };

  function basePose(): Pose {
    if (fly) return between(fly.from, fly.to, gsap.parseEase('develop')(fly.t), PLATE3.cameraLift * 0.6);
    if (override) return override.pose;
    return along(stops, story.s, PLATE3.cameraLift);
  }

  function currentView(): View {
    return { pose: orbit(basePose(), drag.yaw, drag.pitch), fov: CHART_FOV, width: frame.width, height: frame.height };
  }

  /** A stop's pose, lowered so its constellation sits clear of the strip at the foot. */
  function clearOfFoot(pose: Pose): Pose {
    const depth = distance(pose.position, pose.target);
    const drop = frame.band / 2 / pxPerUnit({ pose, fov: CHART_FOV, width: frame.width, height: frame.height }, depth);
    const { up } = basis(pose);
    const move = (p: readonly number[]) => [p[0] - up[0] * drop, p[1] - up[1] * drop, p[2] - up[2] * drop] as const;
    return { position: move(pose.position), target: move(pose.target) };
  }

  function focusId(): string | null {
    if (fly) return fly.id;
    if (override) return override.id;
    const k = Math.floor(story.s + 0.02);
    return k >= 1 ? STOP_ORDER[k - 1] : null;
  }

  // ─── The stop captions: each replaces the last ─────────────────────────────
  function showCaption(index: number): void {
    if (index === caption || still) return;
    const previous = captions[caption];
    caption = index;
    const next = captions[index];
    if (previous) gsap.to(previous, { opacity: 0, duration: shots ? 0 : DUR.crossfade, ease: 'none', overwrite: true });
    if (next) gsap.to(next, { opacity: 1, duration: shots ? 0 : PLATE3.captionDevelop, ease: 'develop', delay: shots || !previous ? 0 : DUR.crossfade, overwrite: true });
  }

  /** The words the current stop's caption names, and how strongly they are set (full once arrived). */
  function stopLabels(): { labels: number[]; labelled: number } {
    let id: string | null = null;
    let strength = 0;
    if (fly) {
      id = fly.id;
      strength = Math.max(0, (fly.t - 0.85) / 0.15);
    } else if (override) {
      id = override.id;
      strength = 1;
    } else if (!still) {
      const k = Math.round(story.s);
      if (k >= 1) {
        id = STOP_ORDER[k - 1];
        strength = Math.max(0, 1 - Math.abs(story.s - k) * 6);
      }
    }
    const words = id && id in STOP_WORDS ? STOP_WORDS[id as keyof typeof STOP_WORDS] : [];
    return { labels: words.map(starFor).filter((i) => i >= 0), labelled: strength };
  }

  // ─── Drawing, once per frame at most, and only when something changed ──────
  function render(): void {
    const view = currentView();
    for (let i = 0; i < lettering.length; i++) lettered[i] = lettering[i].v;
    look.own.fill(0);
    starOf.forEach((star, i) => {
      if (star >= 0) look.own[star] = Math.max(look.own[star], handed[i].v);
    });
    renderer?.render({ view, reveal: look.reveal, own: look.own, draw: look.draw, graticule: look.graticule, reference });
    const project = projector(view);
    STARS.forEach((s, i) => {
      const p = project(s.p);
      const general = Math.min(1, Math.max(0, (look.reveal - data.thresholds[i]) / 0.06));
      cache[i * 3] = p.x;
      cache[i * 3 + 1] = p.y;
      cache[i * 3 + 2] = p.depth > 1 ? Math.max(general, look.own[i]) : 0;
    });
    overlay.update(
      view,
      { lettered, edges: atRest || still, focus: focusId(), rings: story.rings * redraw.v, border: story.border, ...stopLabels() },
      cache,
    );
    const id = focusId();
    showCaption(id ? STOP_ORDER.indexOf(id as (typeof STOP_ORDER)[number]) : -1);
  }

  function nearest(x: number, y: number, radius: number): number | null {
    let best: number | null = null;
    let bestD = radius;
    for (let i = 0; i < STARS.length; i++) {
      if (cache[i * 3 + 2] < 0.5) continue;
      const d = Math.hypot(cache[i * 3] - x, cache[i * 3 + 1] - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function tick(): void {
    if (!visible || !frame.width) return;
    const turning = Math.abs(drag.toYaw - drag.yaw) > 1e-3 || Math.abs(drag.toPitch - drag.pitch) > 1e-3;
    if (turning) {
      const k = still ? 1 : PLATE3.dragLerp;
      drag.yaw += (drag.toYaw - drag.yaw) * k;
      drag.pitch += (drag.toPitch - drag.pitch) * k;
      dirty = true;
    }
    if (!dirty && !pointer.moved) return;
    if (dirty) render();
    dirty = false;
    if (pointer.moved || pointer.inside) {
      pointer.moved = false;
      if (!pointer.inside) {
        overlay.hover(null, 0, 0);
        machine.near(null, 0, 0);
        return;
      }
      const box = host.getBoundingClientRect(); // the one layout read, once per frame
      const x = pointer.x - box.left;
      const y = pointer.y - box.top;
      const hover = dragging ? null : nearest(x, y, PLATE3.hoverRadius);
      overlay.hover(hover, hover === null ? 0 : cache[hover * 3], hover === null ? 0 : cache[hover * 3 + 1]);
      // The lens keeps its star while that star stays well inside it, so its writing holds still.
      const keep = lensStar !== null && cache[lensStar * 3 + 2] >= 0.5 && Math.hypot(cache[lensStar * 3] - x, cache[lensStar * 3 + 1] - y) < PLATE3.lensRadius * 0.8;
      if (!keep) lensStar = nearest(x, y, PLATE3.lensRadius);
      const under = lensStar;
      machine.near(under, under === null ? 0 : cache[under * 3], under === null ? 0 : cache[under * 3 + 1]);
    }
  }
  gsap.ticker.add(tick);

  // ─── Choosing the drawing ─────────────────────────────────────────────────
  function useSvg(): void {
    if (settled) return;
    settled = true;
    renderer = createSvgChart(host, data);
    root.dataset.chart = renderer.kind;
    dirty = true;
  }

  function useGl(): void {
    if (settled || loading) return;
    loading = true;
    if (flags().nogl || backgroundMode() === 'css') {
      useSvg();
      return;
    }
    import('./chart/scene')
      .then(({ createGlChart }) => {
        if (settled) return;
        const gl = createGlChart(host, data);
        if (!gl) {
          useSvg();
          return;
        }
        settled = true;
        renderer = gl;
        root.dataset.chart = gl.kind;
        dirty = true;
      })
      .catch(useSvg);
  }

  const near = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      useGl();
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(root);

  const seen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) dirty = true;
  });
  seen.observe(fieldEl);

  // ─── The reader's own words ────────────────────────────────────────────────
  function applyReader(animate = true): void {
    const { charted, uncharted } = overlay.setReader(getState().readerPieces);
    if (note) {
      const was = !note.hidden;
      note.hidden = uncharted.length === 0;
      if (!note.hidden && !was && !shots) gsap.fromTo(note, { opacity: 0 }, { opacity: 1, duration: DUR.develop, ease: 'develop' });
    }
    if (listYours) {
      listYours.hidden = charted.length === 0;
      listYours.textContent = charted.length ? `Your pieces on this chart: ${charted.join(', ')}.` : '';
    }
    if (listUncharted) listUncharted.textContent = uncharted.length ? `${uncharted0} Yours here: ${uncharted.join(', ')}.` : uncharted0;
    // Drawn by the scroll if the reader hasn't reached them yet; otherwise drawn now.
    if (animate && story.rings > 0 && !shots) gsap.fromTo(redraw, { v: 0 }, { v: 1, duration: PLATE3.ringDraw, ease: 'hand', onUpdate: invalidate });
    dirty = true;
  }
  const unsubscribe = subscribe((_, changed) => {
    if (changed.includes('readerPieces')) applyReader();
  });

  // ─── Touring the chart by name ─────────────────────────────────────────────
  function flyTo(id: string): void {
    const to = clearOfFoot(poseFor(id));
    flyTween?.kill();
    drag.toYaw = 0;
    drag.toPitch = 0;
    if (still) {
      // Reduced motion: a jump, crossfaded in well under 150ms.
      gsap.to([host, overlayEl], {
        opacity: 0,
        duration: DUR.crossfade / 2,
        ease: 'none',
        onComplete: () => {
          override = { id, pose: to };
          dirty = true;
          gsap.to([host, overlayEl], { opacity: 1, duration: DUR.crossfade / 2, ease: 'none' });
        },
      });
      return;
    }
    const from = basePose();
    fly = { id, from, to, t: 0 };
    const screens = distance(from.target, to.target) / 60;
    flyTween = gsap.to(fly, {
      t: 1,
      duration: shots ? 0 : travelTime(screens * window.innerHeight),
      ease: 'none',
      onUpdate: invalidate,
      onComplete: () => {
        override = { id, pose: to };
        fly = null;
        dirty = true;
      },
    });
  }

  overlay.onName((id) => {
    if (atRest || still || !held) {
      flyTo(id);
      return;
    }
    // During the sequence: first to the rest, then the flight.
    const y = held.start + (held.end - held.start) * Math.min(1, restProgress + 0.02);
    scrollToY(y, () => flyTo(id));
  });

  // ─── Pointer: the word under it, the loupe's star, and a gentle turn ───────
  const fine = window.matchMedia('(pointer: fine)');
  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.inside = true;
    pointer.moved = true;
    if (!dragging) return;
    drag.toYaw = gsap.utils.clamp(-PLATE3.dragYaw, PLATE3.dragYaw, dragging.yaw - (e.clientX - dragging.x) * PLATE3.dragPerPx);
    drag.toPitch = gsap.utils.clamp(-PLATE3.dragPitch, PLATE3.dragPitch, dragging.pitch + (e.clientY - dragging.y) * PLATE3.dragPerPx * 0.75);
  };
  const onLeave = () => {
    pointer.inside = false;
    pointer.moved = true;
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || !fine.matches || !(atRest || still)) return;
    if (e.target instanceof Element && e.target.closest('button, a, input, summary')) return;
    dragging = { x: e.clientX, y: e.clientY, yaw: drag.toYaw, pitch: drag.toPitch };
    fieldEl.setPointerCapture(e.pointerId);
  };
  const onUp = () => {
    dragging = null;
  };
  fieldEl.addEventListener('pointermove', onMove);
  fieldEl.addEventListener('pointerdown', onMove);
  fieldEl.addEventListener('pointerleave', onLeave);
  fieldEl.addEventListener('pointerdown', onDown);
  fieldEl.addEventListener('pointerup', onUp);
  fieldEl.addEventListener('pointercancel', onUp);

  // ─── The sequence ─────────────────────────────────────────────────────────
  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add({ wide: WIDE, compact: COMPACT, reduced: REDUCED }, (context) => {
      const { wide, reduced } = context.conditions as Record<string, boolean>;
      const box = host.getBoundingClientRect();
      const band = parseFloat(getComputedStyle(fieldEl).getPropertyValue('--chart-band')) || 0;
      frame = { width: Math.round(box.width), height: Math.round(box.height), band };
      overlay.layout(frame);
      const overview = overviewFor(frame.width, frame.height, band);
      reference = distance(overview.position, overview.target);
      stops = [overview, ...STOP_ORDER.map((id) => clearOfFoot(poseFor(id)))];
      override = null;
      fly = null;
      drag.yaw = drag.pitch = drag.toYaw = drag.toPitch = 0;
      applyReader(false);

      const d = lay(stage, list, pieces, seed);
      toFinal(d);
      gsap.set(list.children, { transformOrigin: '50% 50%' });

      if (reduced) {
        still = true;
        atRest = true;
        stopsEl.classList.add('is-still');
        gsap.set(list.children, { opacity: 0 });
        proxy.brush = 1;
        proxy.exposure = 1;
        latch();
        Object.assign(look, { reveal: 1, draw: 1, graticule: 1 });
        Object.assign(story, { s: 0, rings: 1, border: 1 });
        for (const h of handed) h.v = 1;
        for (const l of lettering) l.v = 1;
        dirty = true;
        useGl();
        return () => {
          still = false;
          stopsEl.classList.remove('is-still');
        };
      }

      stopsEl.classList.add('is-live');
      gsap.set(captions, { opacity: 0 });
      caption = -1;
      Object.assign(look, { reveal: 0, draw: 0, graticule: 0 });
      Object.assign(story, { s: 0, rings: 0, border: 0 });
      for (const h of handed) h.v = 0;
      for (const l of lettering) l.v = 0;
      atRest = false;

      const pinEl = wide ? frameEl : pinned;
      const length = isPhone() ? PINS[3][1] : PINS[3][0];
      const k = length / PINS[3][0];
      const at = (v: number) => v * k;
      const scrub = scrubFor('story');
      const a = PLATE3.approach;
      const p = PLATE3.pin;
      restProgress = (p.stops[4][1] * k) / length;

      const approach = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: 'top bottom', end: wide ? 'top top' : pinStart(pinEl), scrub },
      });
      approach.fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch, immediateRender: false }, a.brush[0]);
      approach.fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(a.exposure), ease: 'develop', onUpdate: latch, immediateRender: false }, a.exposure[0]);
      approach.fromTo(story, { border: 0 }, { border: 1, duration: span(a.border), ease: 'develop', onUpdate: invalidate, immediateRender: false }, a.border[0]);
      if (wide && intro) developOnArrival(intro, scrub);
      approach.set({}, {}, 1);

      const hold = gsap.timeline({
        scrollTrigger: {
          trigger: pinEl,
          start: wide ? 'top top' : pinStart(pinEl),
          end: `+=${length}%`,
          pin: pinEl,
          scrub,
          anticipatePin: 1,
          onUpdate: (st) => {
            const rest = st.progress >= restProgress - 1e-3;
            if (rest !== atRest) {
              atRest = rest;
              if (!rest) {
                // Back into the story: the camera is the scroll's again.
                flyTween?.kill();
                fly = null;
                override = null;
                drag.toYaw = 0;
                drag.toPitch = 0;
              }
              dirty = true;
            }
            // Late for three.js: it has a moment more (the field goes on developing), then the SVG chart stands in.
            if (!settled && !shots && st.progress > LATE && !grace) {
              grace = window.setTimeout(() => {
                if (!settled) useSvg();
              }, PLATE3.threeGrace * 1000);
            }
          },
        },
      });
      held = hold.scrollTrigger ?? null;

      // The hand-off: each piece is unpinned, lifts, travels to its star and gives way to it.
      const box0 = { x: stage.offsetLeft, y: stage.offsetTop };
      const project = projector({ pose: overview, fov: CHART_FOV, width: frame.width, height: frame.height });
      const travel = at(PLATE3.pieceTravel);
      const pull = at(PLATE3.pinPull);
      const n = pieces.length;
      const window0 = at(p.handoff[0]);
      const step = (at(span(p.handoff)) - travel - pull) / (n - 1);
      pieces.forEach((piece, i) => {
        const star = starOf[i];
        const target = star >= 0 ? project(STARS[star].p) : { x: frame.width / 2, y: frame.height - band };
        const dx = target.x - (box0.x + piece.b.x + piece.w / 2);
        const dy = target.y - (box0.y + piece.b.y + piece.h / 2);
        const t0 = window0 + Math.max(0, i * step + (i > 0 ? signed(seed, `handoff-${i}`) * step * 0.3 : 0));
        const t1 = t0 + pull * 0.6;
        const lift = travel * PLATE3.lift;
        const move = travel - lift;
        const fade = travel * PLATE3.fade;
        hold.fromTo(piece.pin, { opacity: 1, scale: 1 }, { opacity: 0, scale: PIN_DROP, duration: pull, ease: 'press', immediateRender: false }, t0);
        hold.fromTo(piece.el, { scale: 1, rotation: piece.turn }, { scale: PLATE3.liftScale, rotation: 0, duration: lift, ease: 'settle', immediateRender: false }, t1);
        hold.fromTo(piece.el, { x: 0 }, { x: dx, duration: move, ease: 'hand', immediateRender: false }, t1 + lift);
        hold.fromTo(piece.el, { y: 0, scale: PLATE3.liftScale }, { y: dy, scale: PLATE3.arriveScale, duration: move, ease: 'develop', immediateRender: false }, t1 + lift);
        hold.fromTo(piece.el, { opacity: 1 }, { opacity: 0, duration: fade, ease: 'develop', immediateRender: false }, t1 + travel - fade);
        hold.fromTo(handed[i], { v: 0 }, { v: 1, duration: fade, ease: 'develop', onUpdate: invalidate, immediateRender: false }, t1 + travel - fade);
      });

      // The chart develops, its threads are drawn at pen speed, its names are lettered.
      hold.fromTo(look, { reveal: 0 }, { reveal: 1, duration: at(span(p.reveal)), ease: 'develop', onUpdate: invalidate, immediateRender: false }, at(p.reveal[0]));
      hold.fromTo(look, { graticule: 0 }, { graticule: 1, duration: at(span(p.graticule)), ease: 'develop', onUpdate: invalidate, immediateRender: false }, at(p.graticule[0]));
      hold.fromTo(look, { draw: 0 }, { draw: 1, duration: at(span(p.lines)), ease: 'none', onUpdate: invalidate, immediateRender: false }, at(p.lines[0]));
      const names = lettering.length;
      const nameStep = (at(span(p.names)) - at(PLATE3.nameSet)) / (names - 1);
      lettering.forEach((l, i) => {
        const t = at(p.names[0]) + i * nameStep + signed(seed, `name-${i}`) * nameStep * 0.3;
        hold.fromTo(l, { v: 0 }, { v: 1, duration: at(PLATE3.nameSet), ease: 'press', onUpdate: invalidate, immediateRender: false }, Math.max(at(p.names[0]), t));
      });
      hold.fromTo(story, { rings: 0 }, { rings: 1, duration: at(span(p.rings)), ease: 'hand', onUpdate: invalidate, immediateRender: false }, at(p.rings[0]));

      // The camera, stop by stop. It moves only when the reader scrolls.
      p.stops.forEach((range, i) => {
        hold.fromTo(story, { s: i }, { s: i + 1, duration: at(span(range as readonly [number, number])), ease: 'develop', onUpdate: invalidate, immediateRender: false }, at(range[0]));
      });
      hold.set({}, {}, length);

      dirty = true;
      return () => {
        held = null;
        stopsEl.classList.remove('is-live');
      };
    });
    ScrollTrigger.refresh();
  };

  build();
  let lastWidth = window.innerWidth;
  let resizeTimer = 0;
  const onResize = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 200);
  };
  window.addEventListener('resize', onResize);

  teardown = () => {
    clearTimeout(grace);
    gsap.ticker.remove(tick);
    near.disconnect();
    seen.disconnect();
    unsubscribe();
    window.removeEventListener('resize', onResize);
    renderer?.destroy();
    overlay.destroy();
  };
}

/** In one column the figure pins centred, unless it is taller than the screen. */
function pinStart(el: HTMLElement) {
  return () => (el.offsetHeight > window.innerHeight * 0.92 ? 'top top' : 'center center');
}

export function destroy(): void {
  mm?.revert();
  mm = null;
  teardown?.();
  teardown = null;
}

export function range(): { start: number; end: number } | null {
  return held ? { start: held.start, end: held.end } : null;
}
