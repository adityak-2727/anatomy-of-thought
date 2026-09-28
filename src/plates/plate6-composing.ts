// Plate VI. The composing stick. Each chosen piece drops into the stick as a metal sort;
// a loop arrow carries it back to the end of the sentence, and the whole reading runs
// again, once, to choose the next. When the end mark is set there is no loop: the reading
// has stopped, and the plate tones, blue to umber and white to cream, from the centre out,
// as the answer is printed.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, createField, type FieldHandle } from '../gl/background';
import { initLoupe } from '../components/loupe';
import { spaceMark, svgEl } from '../components/marks';
import { END, REPLY, ANSWER, type Variant } from '../data/specimen';
import { pieceId } from '../lib/hash';
import { spokenPiece } from '../data/chart';
import { DUR, PINS, PLATE6, SEEDS } from '../motion/eases';
import { COMPACT, STILL, WIDE, isPhone } from '../motion/media';
import { scrubFor } from '../motion/scroll';
import { developOnArrival } from '../motion/verbs';
import { getState, subscribe } from '../state';
import { drawStick, type Stick } from './composing/stick';

gsap.registerPlugin(ScrollTrigger);

const span = (r: readonly [number, number]) => r[1] - r[0];

let mm: gsap.MatchMedia | null = null;
let held: ScrollTrigger | null = null;
let teardown: (() => void) | null = null;

export function init(root: HTMLElement): void {
  const frameEl = root.querySelector<HTMLElement>('.plate__frame')!;
  const fieldEl = root.querySelector<HTMLElement>('.stick-field')!;
  const stickEl = fieldEl.querySelector<HTMLElement>('.stick')!;
  const answer = fieldEl.querySelector<HTMLElement>('.stick__answer')!;
  const machineEl = fieldEl.querySelector<HTMLElement>('.machine')!;
  const intro = root.querySelector<HTMLElement>('.plate__intro');
  const note = root.querySelector<HTMLElement>('.plate__note');
  const caption = root.querySelector<HTMLElement>('.plate__caption');
  const table = root.querySelector<HTMLElement>('[data-reply]');
  const seed = SEEDS.plates[5];

  const field: FieldHandle = createField(fieldEl, { seed, angle: -6, strokes: 4, overshoot: 18, bias: 0.5 });
  const proxy = { brush: 0, exposure: 0 };
  // Exposure only ever increases; toning belongs to the story, and can be undone.
  const latch = () => advanceField(field, proxy);
  initLoupe(fieldEl);

  const css = getComputedStyle(document.documentElement);
  const ink = {
    paper: css.getPropertyValue('--paper').trim(),
    cream: css.getPropertyValue('--tone-cream').trim(),
  };

  let variant: Variant = getState().variant;
  let stick: Stick | null = null;
  let toned = false;
  let bath: gsap.core.Timeline | null = null;

  // ─── Toning: a bath, in time ───────────────────────────────────────────────
  function tone(on: boolean, instant = false): void {
    if (on === toned && !instant) return;
    toned = on;
    bath?.kill();
    const s = stick;
    const tl = gsap.timeline();
    bath = tl;
    const duration = instant ? 0 : on ? DUR.tone : PLATE6.untone;
    const colour = on ? ink.cream : ink.paper;
    tl.to(field.state, { tone: on ? 1 : 0, duration, ease: 'tone', onUpdate: () => field.invalidate() }, 0);
    // White becomes cream from the centre out, in step with the bath in the shader.
    if (s) {
      for (const { el, reach } of s.toning) {
        // Ink stays ink (the faces, the fleuron); paper, whether filled or drawn, becomes cream.
        if (el.matches('.sort__face, .sort__fleuron')) continue;
        const paint = el.matches('rect, .sort__body') ? { fill: colour, stroke: colour } : { stroke: colour };
        tl.to(el, { ...paint, duration: duration * 0.5, ease: 'tone' }, reach * duration * 0.5);
      }
    }
    if (on) {
      if (instant) gsap.set(answer, { opacity: 1, y: 0 });
      else tl.fromTo(answer, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: DUR.press, ease: 'press' }, duration * PLATE6.answerAt);
    } else {
      tl.to(answer, { opacity: 0, duration: Math.min(duration, DUR.crossfade), ease: 'none' }, 0);
    }
    fieldEl.classList.toggle('is-toned', on);
  }

  // ─── Laying the stick out ─────────────────────────────────────────────────
  function lay(): Stick {
    const width = stickEl.clientWidth;
    const height = stickEl.clientHeight;
    const style = getComputedStyle(stickEl);
    const slip = parseFloat(style.getPropertyValue('--mini-slip')) || 11;
    const sort = parseFloat(style.getPropertyValue('--sort-h')) || 46;
    // Measure faces in the sort's own type, in a scratch SVG, once.
    const probe = svgEl('svg', { class: 'stick__art', width: 1, height: 1, 'aria-hidden': 'true' });
    stickEl.append(probe);
    const text = svgEl('text', { class: 'sort__face' }, probe);
    const measure = (t: string) => {
      text.textContent = t;
      return text.getComputedTextLength();
    };
    const s = drawStick(width, height, REPLY[variant], seed, { slip, sort }, measure);
    probe.remove();
    stickEl.replaceChildren(s.svg);
    stickEl.setAttribute('aria-label', `A composing stick holding the reply: ${REPLY[variant].map(spokenPiece).join(', ')}, and the end mark.`);
    answer.textContent = ANSWER[variant];
    writeMachine(s);
    writeTable();
    return s;
  }

  function writeMachine(s: Stick): void {
    const offset = { x: stickEl.offsetLeft + machineEl.offsetLeft * -1, y: stickEl.offsetTop + machineEl.offsetTop * -1 };
    machineEl.replaceChildren(
      ...s.sorts.map((sort) => {
        const item = document.createElement('span');
        item.className = 'machine__item';
        Object.assign(item.style, { left: `${offset.x + sort.x + sort.w / 2}px`, top: `${offset.y + sort.y + 2}px` });
        const word = document.createElement('span');
        word.className = 'machine__piece';
        if (sort.piece.startsWith(' ')) word.append(spaceMark());
        word.append(sort.piece === END ? 'end' : sort.piece.replace(/^ /, '').replace(/'/g, '’'));
        const num = document.createElement('span');
        num.className = 't-machine';
        num.textContent = String(pieceId(sort.piece));
        item.append(word, num);
        return item;
      }),
    );
  }

  function writeTable(): void {
    if (!table) return;
    const name = (p: string) => (p === END ? 'the end mark' : p.startsWith(' ') ? `space, ${spokenPiece(p)}` : spokenPiece(p));
    table.replaceChildren(
      ...[...REPLY[variant], END].map((p) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = name(p);
        const td = document.createElement('td');
        td.dataset.replyId = '';
        td.textContent = String(pieceId(p));
        tr.append(th, td);
        return tr;
      }),
    );
  }

  const unsubscribe = subscribe((state, changed) => {
    if (!changed.includes('variant')) return;
    variant = state.variant;
    build();
  });

  // ─── The sequence ─────────────────────────────────────────────────────────
  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add({ wide: WIDE, compact: COMPACT, reduced: STILL }, (context) => {
      const { wide, reduced } = context.conditions as Record<string, boolean>;
      const s = lay();
      stick = s;
      toned = false;
      bath?.kill();
      field.state.tone = 0;
      field.invalidate();
      gsap.set(answer, { opacity: 0 });

      if (reduced) {
        proxy.brush = 1;
        proxy.exposure = 1;
        latch();
        // As the sequence leaves it: each reading's sweep gone, each loop arrow a faint record.
        for (const l of s.loops) {
          gsap.set(l.threads, { opacity: 0 });
          gsap.set(l.arrow, { opacity: 0.35 });
        }
        tone(true, true);
        return;
      }

      // Nothing is set yet: the sorts wait above the stick, the arrows and new slips unmade.
      const drop = parseFloat(getComputedStyle(stickEl).getPropertyValue('--sort-drop')) || 70;
      const sortsOf = [...s.loops.map((l) => l.sort), s.end];
      gsap.set(sortsOf, { y: -drop, opacity: 0 });
      for (const l of s.loops) {
        gsap.set(l.arrow, { strokeDasharray: '0 1' });
        gsap.set(l.slip, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
        gsap.set(l.threads, { strokeDasharray: '0 1', opacity: 1 });
      }

      // In one column only the field pins; the caption follows it, so the pin fits a

      // phone's screen (Phase 8).

      const pinEl = wide ? frameEl : fieldEl;
      const length = isPhone() ? PINS[6][1] : PINS[6][0];
      const k = length / PINS[6][0];
      const at = (v: number) => v * k;
      const scrub = scrubFor('story');
      const a = PLATE6.approach;
      const p = PLATE6.pin;

      const approach = gsap.timeline({
        scrollTrigger: { trigger: pinEl, start: 'top bottom', end: wide ? 'top top' : pinStart(pinEl), scrub },
      });
      approach.fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch, immediateRender: false }, a.brush[0]);
      approach.fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(a.exposure), ease: 'develop', onUpdate: latch, immediateRender: false }, a.exposure[0]);
      approach.set({}, {}, 1);
      if (wide && intro) developOnArrival(intro, scrub);

      const toneAt = at(p.toneAt) / length;
      const hold = gsap.timeline({
        scrollTrigger: {
          trigger: pinEl,
          start: wide ? 'top top' : pinStart(pinEl),
          end: `+=${length}%`,
          pin: pinEl,
          scrub,
          anticipatePin: 1,
          // The end mark is set: the bath begins, and plays in its own time.
          onUpdate: (st) => tone(st.progress >= toneAt),
        },
      });
      held = hold.scrollTrigger ?? null;

      // One loop per chosen piece: it drops in, loops back, and the reading runs again.
      // Each loop's share of the loops' span, by its weight: the first slowest.
      const weights = s.loops.map((_, n) => PLATE6.loopWeights[Math.min(n, PLATE6.loopWeights.length - 1)]);
      const unit = at(span(p.loops)) / weights.reduce((a, b) => a + b, 0);
      const L = PLATE6.loop;
      let loopStart = at(p.loops[0]);
      // set: the sort falls into the stick, stops dead, and recoils exactly 1px.
      const drops = (el: SVGGElement, t: number, d: number) => {
        const r = d / DUR.press;
        hold.fromTo(el, { y: -drop, opacity: 0 }, { y: 0, opacity: 1, duration: d, ease: 'press', immediateRender: false }, t);
        hold.to(el, { y: -1, duration: DUR.recoilUp * r, ease: 'power1.out', immediateRender: false }, t + d);
        hold.to(el, { y: 0, duration: DUR.recoilDown * r, ease: 'power1.in', immediateRender: false }, t + d + DUR.recoilUp * r);
      };
      s.loops.forEach((loop, n) => {
        const loopSpan = weights[n] * unit;
        const t0 = loopStart;
        loopStart += loopSpan;
        const beat = (r: readonly [number, number]) => [t0 + r[0] * loopSpan, (r[1] - r[0]) * loopSpan] as const;
        const [dropAt, dropFor] = beat(L.drop);
        drops(loop.sort, dropAt, dropFor);
        const [arrowAt, arrowFor] = beat(L.arrow);
        hold.fromTo(loop.arrow[0], { strokeDasharray: '0 1' }, { strokeDasharray: '1 0', duration: arrowFor * 0.85, ease: 'hand', immediateRender: false }, arrowAt);
        hold.fromTo(loop.arrow[1], { strokeDasharray: '0 1' }, { strokeDasharray: '1 0', duration: arrowFor * 0.15, ease: 'hand', immediateRender: false }, arrowAt + arrowFor * 0.85);
        const [slipAt, slipFor] = beat(L.append);
        hold.fromTo(loop.slip, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: slipFor, ease: 'settle', immediateRender: false }, slipAt);
        const [threadAt, threadFor] = beat(L.rethread);
        hold.fromTo(loop.threads, { strokeDasharray: '0 1', opacity: 1 }, { strokeDasharray: '1 0', duration: threadFor * 0.55, ease: 'hand', immediateRender: false }, threadAt);
        hold.to(loop.threads, { opacity: 0, duration: threadFor * 0.45, ease: 'develop', immediateRender: false }, threadAt + threadFor * 0.55);
        // The arrow stays, faintly, as a record of the loop.
        hold.to(loop.arrow, { opacity: 0.35, duration: threadFor, ease: 'develop', immediateRender: false }, threadAt);
      });
      drops(s.end, at(p.end[0]), at(span(p.end)));
      if (wide) {
        if (note) hold.fromTo(note, { opacity: 0 }, { opacity: 1, duration: at(20), ease: 'develop', immediateRender: false }, at(p.end[0]));
        if (caption) hold.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: at(20), ease: 'develop', immediateRender: false }, at(p.end[0]) + at(10));
      }
      hold.set({}, {}, length);
      return () => {
        held = null;
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
    unsubscribe();
    bath?.kill();
    window.removeEventListener('resize', onResize);
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
