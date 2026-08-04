import { useEffect, useState } from 'react';

interface UseIsInViewportResult<T extends Element> {
  /** Callback ref to attach to the element being observed. */
  ref: (node: T | null) => void;
  isInViewport: boolean;
}

/**
 * Reports whether an element is currently on screen.
 *
 * Used to decide when the floating transport bar is needed: it appears only once
 * the real transport has scrolled away, so the user never sees two play buttons at
 * the same time.
 *
 * The observed node is held in state rather than a ref object because the effect
 * has to re-run when the element actually mounts, and a ref mutation does not
 * trigger that.
 */
export function useIsInViewport<T extends Element>(): UseIsInViewportResult<T> {
  const [node, setNode] = useState<T | null>(null);
  // Defaults to true so the floating bar does not flash on first paint before the
  // observer has reported anything.
  const [isInViewport, setIsInViewport] = useState(true);

  useEffect(() => {
    if (!node) return;

    // Older browsers without IntersectionObserver keep the default, which simply
    // means the floating bar stays hidden rather than misbehaving.
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry) setIsInViewport(entry.isIntersecting);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, isInViewport };
}
