import { useCallback, useSyncExternalStore } from 'react';

const NOOP_UNSUBSCRIBE = () => {};

function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Subscribes to a CSS media query.
 *
 * Needed because the keyboard changes how many octaves it *renders*, not just how
 * it styles them, and that cannot be expressed in CSS alone: white keys share the
 * row width via flex, so the octave count has to be known when building the DOM.
 *
 * Implemented with useSyncExternalStore rather than useState + useEffect. The
 * effect version has to call setState on mount to catch a query that changed
 * between render and subscribe, which costs an extra render pass every mount and
 * is exactly the cascading-render pattern react-hooks warns about.
 * useSyncExternalStore reads the current value during render instead, so there is
 * no second pass and no tearing.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!supportsMatchMedia()) return NOOP_UNSUBSCRIBE;

      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => (supportsMatchMedia() ? window.matchMedia(query).matches : false),
    [query]
  );

  // Server snapshot: assume the narrow layout, which is the safe default because
  // it renders fewer keys and cannot overflow.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
