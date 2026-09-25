// Plate II: “Lay down a sentence of your own”. The reader's words are written on a slip
// of sensitised paper; “Expose” clears it to white and cuts it the way the specimen was
// cut, in time rather than by scroll. The pieces go to Plate III. “Clear” starts again.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { advanceField, createField } from '../gl/background';
import { initLoupe } from '../components/loupe';
import { MAX_PIECES, tokenise } from '../lib/tokeniser';
import { DUR, READER, SEEDS, pen } from '../motion/eases';
import { MOTION_ONLY, REDUCED } from '../motion/media';
import { prefersReduced } from '../motion/reduced-motion';
import { scrubFor } from '../motion/scroll';
import { setState } from '../state';
import { addCuts, addFixing, addParting, addSeparating, lay, pieceItem, prepare, toFinal, toStrip, writeMachine, type Laid } from './dissect';

// The atlas's words for each outcome (BRIEF §6), the button's verb reused in the result.
const SAY = {
  tooFew: 'Write at least two words.',
  tooLong: 'Keep it under 120 characters.',
  tooManyPieces: 'Keep it under forty pieces.',
  exposed: 'Exposed. Your pieces will appear on the next plate.',
  cleared: 'Cleared.',
};
const MAX_CHARS = 120;

const span = (r: readonly [number, number]) => r[1] - r[0];

/** What is wrong with a sentence, in the atlas's voice; nothing if it can be exposed. */
export function problemWith(sentence: string): string | null {
  const words = sentence.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length < 2) return SAY.tooFew;
  if (sentence.length > MAX_CHARS) return SAY.tooLong;
  if (tokenise(sentence).total > MAX_PIECES) return SAY.tooManyPieces;
  return null;
}

export function initReader(bench: HTMLElement): void {
  const fieldEl = bench.querySelector<HTMLElement>('.reader-field')!;
  const form = bench.querySelector<HTMLFormElement>('.reader-form')!;
  const input = bench.querySelector<HTMLInputElement>('.reader-slip')!;
  const slipWrap = bench.querySelector<HTMLElement>('.reader-form__slip')!;
  const stage = bench.querySelector<HTMLElement>('.reader-stage')!;
  const list = bench.querySelector<HTMLElement>('.reader-pieces')!;
  const status = bench.querySelector<HTMLElement>('.reader-status')!;
  const clear = bench.querySelector<HTMLButtonElement>('.reader-clear')!;
  const machine = fieldEl.querySelector<HTMLElement>('.machine')!;
  const seed = SEEDS.plates[1] + 500;

  const field = createField(fieldEl, { seed, angle: -4, strokes: 3, overshoot: 12, bias: 0.5 });
  initLoupe(fieldEl);

  // The bench is brushed and exposed as it comes into view, and stays so.
  const proxy = { brush: 0, exposure: 0 };
  const latch = () => advanceField(field, proxy);
  gsap.matchMedia().add({ motion: MOTION_ONLY, reduced: REDUCED }, (context) => {
    if ((context.conditions as Record<string, boolean>).reduced) {
      proxy.brush = 1;
      proxy.exposure = 1;
      latch();
      return;
    }
    const a = READER.approach;
    gsap
      .timeline({ scrollTrigger: { trigger: fieldEl, start: 'top 95%', end: 'top 45%', scrub: scrubFor('story') } })
      .fromTo(proxy, { brush: 0 }, { brush: 1, duration: span(a.brush), ease: 'brush', onUpdate: latch, immediateRender: false }, a.brush[0])
      .fromTo(proxy, { exposure: 0 }, { exposure: 1, duration: span(a.exposure), ease: 'develop', onUpdate: latch, immediateRender: false }, a.exposure[0])
      .set({}, {}, 1);
  });

  let laid: Laid | null = null;
  const say = (text: string) => {
    status.textContent = text;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const sentence = input.value.replace(/\s+/g, ' ').trim();
    const problem = problemWith(sentence);
    if (problem) {
      say(problem);
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    expose(sentence);
  });

  const expose = (sentence: string) => {
    const texts = tokenise(sentence).pieces;
    // The reader's words go in as plain text, never as markup.
    list.replaceChildren(...texts.map(pieceItem));
    bench.classList.add('is-exposed');
    say('');
    const pieces = prepare(list, seed, undefined, true);
    const d = lay(stage, list, pieces, seed);
    laid = d;
    writeMachine(machine, stage, d);
    setState({ readerSentence: sentence, readerPieces: texts });
    ScrollTrigger.refresh();

    const finished = () => {
      say(SAY.exposed);
      clear.hidden = false;
      clear.focus({ preventScroll: true });
    };

    if (prefersReduced()) {
      toFinal(d);
      gsap.fromTo(stage, { opacity: 0 }, { opacity: 1, duration: DUR.crossfade, onComplete: finished });
      return;
    }

    toStrip(d);
    // The slip clears from sensitiser to paper, strip by strip…
    const washes = d.strips.map((s) => {
      const wash = document.createElement('span');
      wash.className = 'reader-wash';
      wash.setAttribute('aria-hidden', 'true');
      Object.assign(wash.style, { left: `${s.left}px`, top: `${s.top}px`, width: `${s.right - s.left}px`, height: `${d.pieces[0].h}px` });
      stage.append(wash);
      return wash;
    });
    const tl = gsap.timeline({ onComplete: finished });
    tl.fromTo(washes, { opacity: 1 }, { opacity: 0, duration: READER.wash, ease: 'develop' }, 0);
    // …then it is cut, parted, laid out, pinned and numbered, as the specimen was.
    const each = pen(d.pieces[0].h + 6);
    const cutsSpan = d.cuts.length * READER.cutStagger + each;
    let t = READER.cutsAt;
    addCuts(tl, d, t, cutsSpan, each);
    t += cutsSpan;
    addParting(tl, d, t, READER.part);
    t += READER.part;
    addSeparating(tl, d, t, READER.separate);
    t += READER.separate * 0.8;
    const fixSpan = d.pieces.length * READER.fixStagger + DUR.press + DUR.ticker;
    addFixing(tl, d, t, fixSpan, { pin: DUR.press, letter: 0, ticker: DUR.ticker });
    tl.add(() => washes.forEach((w) => w.remove()));
  };

  clear.addEventListener('click', () => {
    const reset = () => {
      list.replaceChildren();
      stage.querySelectorAll('.offcut, .reader-wash').forEach((el) => el.remove());
      stage.querySelector('.cuts')?.replaceChildren();
      stage.style.height = '';
      machine.replaceChildren();
      laid = null;
      bench.classList.remove('is-exposed');
      clear.hidden = true;
      input.value = '';
      setState({ readerSentence: '', readerPieces: [] });
      say(SAY.cleared);
      input.focus({ preventScroll: true });
      ScrollTrigger.refresh();
      // A fresh slip of sensitised paper is brushed back into place.
      gsap.fromTo(slipWrap, { opacity: 0 }, { opacity: 1, duration: prefersReduced() ? DUR.crossfade : READER.brushBack, ease: 'brush' });
    };
    if (!laid || prefersReduced()) {
      reset();
      return;
    }
    gsap.to(stage, { opacity: 0, duration: READER.clear, ease: 'develop', onComplete: () => {
      gsap.set(stage, { opacity: 1 });
      reset();
    } });
  });
}
