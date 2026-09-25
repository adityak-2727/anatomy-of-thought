// Address-bar switches: ?shots (screenshot checkpoints), ?debug (tuning), ?nogl (CSS fallback).

export interface Flags {
  shots: boolean;
  debug: boolean;
  nogl: boolean;
}

let cached: Flags | null = null;

export function flags(): Flags {
  if (!cached) {
    const params = new URLSearchParams(location.search);
    cached = { shots: params.has('shots'), debug: params.has('debug'), nogl: params.has('nogl') };
  }
  return cached;
}
