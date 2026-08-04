/**
 * Generates a collision-resistant id for an accompaniment layer.
 *
 * Only call this from event handlers or module-level migration code, never during
 * render: it is deliberately impure. For the initial layer that has to exist on
 * first render, use React's useId() instead, which is render-safe.
 */
export function createLayerId(): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `layer-${unique}`;
}
