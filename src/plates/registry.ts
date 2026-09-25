// Plate modules are split from the first screen's code and loaded once the frontispiece
// has had its moment (or sooner, if the reader heads for a plate). Each plate owns its pin.

import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface PlateModule {
  init(root: HTMLElement): void;
  destroy(): void;
  /** The pinned stretch of scroll, in document px; null when the plate isn't pinned (reduced motion). */
  range(): { start: number; end: number } | null;
}

const LOADERS: Record<number, () => Promise<PlateModule>> = {
  1: () => import('./plate1-specimen'),
  2: () => import('./plate2-dissection'),
};

const loaded = new Map<number, PlateModule>();
let all: Promise<void> | null = null;

async function load(n: number): Promise<PlateModule | null> {
  const existing = loaded.get(n);
  if (existing) return existing;
  const loader = LOADERS[n];
  const root = document.getElementById(`plate-${n}`);
  if (!loader || !root) return null;
  const mod = await loader();
  if (!loaded.has(n)) {
    mod.init(root);
    loaded.set(n, mod);
  }
  return mod;
}

/** Load every plate that has code yet, in page order, then re-measure the scroll. */
export function loadAllPlates(): Promise<void> {
  all ??= (async () => {
    for (const n of Object.keys(LOADERS).map(Number).sort((a, b) => a - b)) await load(n);
    ScrollTrigger.refresh();
  })();
  return all;
}

export function plate(n: number): PlateModule | null {
  return loaded.get(n) ?? null;
}
