// Reduced motion: Lenis off, no pinning or scrubbing, plates shown fully developed,
// interactive changes as crossfades of 150ms or less (BRIEF §5).

export const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
export const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';

const query = typeof window !== 'undefined' ? window.matchMedia(REDUCED_QUERY) : null;

export function prefersReduced(): boolean {
  return query?.matches ?? false;
}

export function onReducedChange(callback: (reduced: boolean) => void): () => void {
  if (!query) return () => {};
  const listener = (e: MediaQueryListEvent) => {
    document.documentElement.classList.toggle('rm', e.matches);
    callback(e.matches);
  };
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
