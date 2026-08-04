/**
 * Generates a collision-resistant id for an accompaniment layer.
 *
 * Only call this from event handlers or module-level migration code, never during
 * render: it is deliberately impure. For the initial layer that has to exist on
 * first render, use React's useId() instead, which is render-safe.
 */
export function createLayerId(): string {
  return `layer-${uniqueSuffix()}`;
}

/**
 * Generates an id for a chord in the progression. Chords are keyed by this in
 * React lists and looked up by it on remove/reorder, so ids must be unique even
 * when several chords are created in the same millisecond -- which is exactly what
 * happens when the AI returns a whole progression at once.
 */
export function createChordId(): string {
  return `chord-${uniqueSuffix()}`;
}

function uniqueSuffix(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
