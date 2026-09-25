// The atlas's shared state (BRIEF §7): the variant, and the reader's own sentence.
// Tiny subscribe and notify; Plates III–VI read it. (The #small hash is read here;
// Phase 5 adds the switch that writes it.)

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
