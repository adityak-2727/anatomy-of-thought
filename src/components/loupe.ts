// The loupe: over a figure, the cursor becomes a lens that shows the machine's view
// beneath the drawing. Fine pointers hover; touch presses and holds; keyboards and
// screen readers use the "Show the machine’s view" button and the table after the figure.

import { gsap } from 'gsap';
import { DUR, live } from '../motion/eases';
import { prefersReduced } from '../motion/reduced-motion';
import { lensRim } from './marks';

const MAGNIFY = 1.4;
const HOLD_MS = 350;
const HOLD_SLOP = 8;          // px a finger may drift before it counts as a scroll
const TOUCH_LIFT = 100;       // px the lens sits above the finger

let rim: HTMLElement | null = null;
let lensSize = 168;
let active: Loupe | null = null;
let used = false;

interface Loupe {
  figure: HTMLElement;
  machine: HTMLElement;
  target: { x: number; y: number };
  now: { x: number; y: number };
  lift: number;
}

function ensureRim(): HTMLElement {
  if (rim) return rim;
  const css = getComputedStyle(document.documentElement);
  lensSize = parseFloat(css.getPropertyValue('--lens-size')) || lensSize;
  const rimWidth = parseFloat(css.getPropertyValue('--lens-rim')) || 1.5;
  rim = document.createElement('div');
  rim.className = 'lens';
  rim.setAttribute('aria-hidden', 'true');
  rim.append(lensRim(lensSize, rimWidth));
  document.body.append(rim);
  return rim;
}

// The lens magnifies what lies under the pointer. On touch it is shown `lift` px
// above the finger, so the finger never covers what it is looking at.
function place(l: Loupe): void {
  const host = l.machine.offsetParent as HTMLElement;
  const box = host.getBoundingClientRect(); // the one layout read, once per frame
  const x = l.now.x;
  const y = l.now.y;
  const lx = x - box.left - l.machine.offsetLeft;
  const ly = y - box.top - l.machine.offsetTop;
  const radius = lensSize / 2 / MAGNIFY;
  l.machine.style.clipPath = `circle(${radius.toFixed(1)}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`;
  l.machine.style.transformOrigin = `${lx.toFixed(1)}px ${ly.toFixed(1)}px`;
  l.machine.style.transform = `translate(0, ${-l.lift}px) scale(${MAGNIFY})`;
  rim!.style.transform = `translate(${(x - lensSize / 2).toFixed(1)}px, ${(y - l.lift - lensSize / 2).toFixed(1)}px)`;
}

function follow(): void {
  if (!active) return;
  const k = prefersReduced() ? 1 : live.loupeLerp;
  active.now.x += (active.target.x - active.now.x) * k;
  active.now.y += (active.target.y - active.now.y) * k;
  place(active);
}

function show(l: Loupe, x: number, y: number, lift: number): void {
  if (l.machine.classList.contains('is-revealed')) return;
  active = l;
  l.lift = lift;
  l.target = { x, y };
  l.now = { x, y };
  place(l);
  l.machine.classList.add('is-live');
  rim!.classList.add('is-live');
  if (!used) {
    used = true;
    document.dispatchEvent(new CustomEvent('atlas:loupe-used'));
  }
}

function hide(l: Loupe): void {
  if (active === l) active = null;
  l.machine.classList.remove('is-live');
  rim?.classList.remove('is-live');
}

function overControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('button, input, a, label, [data-no-loupe]');
}

/** Wire one figure. It needs a `.machine` layer inside it, and may hold a `.loupe-toggle`. */
export function initLoupe(figure: HTMLElement): () => void {
  const machine = figure.querySelector<HTMLElement>('.machine');
  if (!machine) return () => {};
  ensureRim();
  const l: Loupe = { figure, machine, target: { x: 0, y: 0 }, now: { x: 0, y: 0 }, lift: 0 };
  const fine = window.matchMedia('(pointer: fine)');
  let holdTimer = 0;
  let holdStart = { x: 0, y: 0 };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      if (active === l) {
        l.target = { x: e.clientX, y: e.clientY };
      } else if (holdTimer && Math.hypot(e.clientX - holdStart.x, e.clientY - holdStart.y) > HOLD_SLOP) {
        clearTimeout(holdTimer);
        holdTimer = 0;
      }
      return;
    }
    if (!fine.matches) return;
    const control = overControl(e.target);
    figure.classList.toggle('loupe-off', control);
    if (control) {
      hide(l);
      return;
    }
    if (active !== l) show(l, e.clientX, e.clientY, 0);
    l.target = { x: e.clientX, y: e.clientY };
  };

  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') hide(l);
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || overControl(e.target)) return;
    holdStart = { x: e.clientX, y: e.clientY };
    holdTimer = window.setTimeout(() => {
      holdTimer = 0;
      show(l, holdStart.x, holdStart.y, TOUCH_LIFT);
    }, HOLD_MS);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    clearTimeout(holdTimer);
    holdTimer = 0;
    hide(l);
  };

  // Once the lens is up, the finger moves the lens instead of the page.
  const onTouchMove = (e: TouchEvent) => {
    if (active === l) e.preventDefault();
  };

  const onContext = (e: Event) => {
    if (active === l) e.preventDefault();
  };

  figure.addEventListener('pointermove', onMove);
  figure.addEventListener('pointerleave', onLeave);
  figure.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  figure.addEventListener('touchmove', onTouchMove, { passive: false });
  figure.addEventListener('contextmenu', onContext);

  const toggle = figure.querySelector<HTMLButtonElement>('.loupe-toggle');
  const labelShow = toggle?.dataset.show ?? 'Show the machine’s view';
  const labelHide = toggle?.dataset.hide ?? 'Hide the machine’s view';
  const onToggle = () => {
    const reveal = !machine.classList.contains('is-revealed');
    hide(l);
    machine.style.clipPath = '';
    machine.style.transform = '';
    machine.classList.toggle('is-revealed', reveal);
    if (toggle) toggle.querySelector('.sens__label')!.textContent = reveal ? labelHide : labelShow;
  };
  toggle?.addEventListener('click', onToggle);

  return () => {
    hide(l);
    figure.removeEventListener('pointermove', onMove);
    figure.removeEventListener('pointerleave', onLeave);
    figure.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    figure.removeEventListener('touchmove', onTouchMove);
    figure.removeEventListener('contextmenu', onContext);
    toggle?.removeEventListener('click', onToggle);
  };
}

/** The one-time hint. Its wording follows the kind of pointer; it goes once the loupe is used. */
export function initLoupeHint(hint: HTMLElement): void {
  if (window.matchMedia('(pointer: coarse)').matches && hint.dataset.touch) {
    const text = hint.querySelector('[data-hint-text]');
    if (text) text.textContent = hint.dataset.touch;
  }
  document.addEventListener('atlas:loupe-used', () => gsap.to(hint, { autoAlpha: 0, duration: DUR.move, ease: 'develop' }), { once: true });
}

gsap.ticker.add(follow);
