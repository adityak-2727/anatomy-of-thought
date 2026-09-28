// The atlas's shared state (BRIEF §7): the variant, and the reader's own sentence.
// Tiny subscribe and notify; Plates III–VI read it. The variant lives in the address bar
// as #small, written with replaceState so the page never jumps.

import type { Variant } from './data/specimen';

export interface AtlasState {
  variant: Variant;
  readerSentence: string;
  readerPieces: readonly string[];
}

type Listener = (state: Readonly<AtlasState>, changed: ReadonlyArray<keyof AtlasState>) => void;

const state: AtlasState = {
  variant: typeof location !== 'undefined' && location.hash === '#small' ? 'small' : 'big',
  readerSentence: '',
  readerPieces: [],
};

const listeners = new Set<Listener>();

export function getState(): Readonly<AtlasState> {
  return state;
}

export function setState(patch: Partial<AtlasState>): void {
  const changed = (Object.keys(patch) as (keyof AtlasState)[]).filter((k) => patch[k] !== state[k]);
  if (!changed.length) return;
  Object.assign(state, patch);
  for (const listener of listeners) listener(state, changed);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const readHash = (): Variant => (location.hash === '#small' ? 'small' : 'big');

/** Keep #small in the address bar in step with the variant, and follow it if the reader edits it. */
export function syncVariantWithAddress(): void {
  subscribe((s, changed) => {
    if (!changed.includes('variant') || readHash() === s.variant) return;
    const url = s.variant === 'small' ? '#small' : location.pathname + location.search;
    history.replaceState(history.state, '', url);
  });
  window.addEventListener('hashchange', () => setState({ variant: readHash() }));
}
