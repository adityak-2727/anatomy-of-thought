// Turning scores into likelihoods, and choosing (BRIEF §3). Pure and dependency-free.

/** At or below this temperature the machine simply takes the favourite. */
export const COLDEST = 0.05;

/**
 * p = exp(score / T) / sum of exp(score / T), with the largest score subtracted first so
 * large scores cannot overflow. At T ≤ 0.05 the favourite takes everything.
 */
export function softmax(scores: readonly number[], temperature: number): number[] {
  const top = Math.max(...scores);
  if (temperature <= COLDEST) {
    const first = scores.indexOf(top);
    return scores.map((_, i) => (i === first ? 1 : 0));
  }
  const exps = scores.map((s) => Math.exp((s - top) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Draw one index from likelihoods `p`, given a uniform number `r` in [0, 1). */
export function sample(p: readonly number[], r: number): number {
  let cumulative = 0;
  for (let i = 0; i < p.length; i++) {
    cumulative += p[i];
    if (r < cumulative) return i;
  }
  return p.length - 1;
}

/** A likelihood as it is written on the ticker: a percentage to one place. */
export function percent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}
