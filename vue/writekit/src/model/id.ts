/**
 * Stable, collision-resistant identifier for blocks. Block ids survive
 * split/merge/move and are how positions, selections, and the CRDT address a
 * block — so they must be unique and never reused.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();

  // Fallback for exotic runtimes without WebCrypto (Node >= 19 and all target
  // browsers provide `crypto.randomUUID`, so this is effectively dead code).
  return `b-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
