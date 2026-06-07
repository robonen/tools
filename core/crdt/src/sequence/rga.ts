import type { OpId, VersionVector } from '../clock';
import { compareOpId, opIdEq } from '../clock';

/** One element of an RGA sequence (visible or tombstoned). */
export interface RgaNode<T> {
  readonly id: OpId;
  readonly value: T;
  readonly originLeft: OpId | null;
  deleted: boolean;
}

/**
 * Replicated Growable Array — a sequence CRDT. Each element is inserted after a
 * left-origin element (or at the start) and tombstoned on delete. Concurrent
 * inserts at the same origin are ordered higher-op-id-first, a deterministic
 * tie-break that makes every replica converge to the same order. Operations must
 * be integrated in causal order (an insert's origin must already be present);
 * {@link integrateInsert} returns `false` when the origin is missing so the
 * caller can buffer and retry.
 */
export class Rga<T> {
  private nodes: Array<RgaNode<T>> = [];

  private nodeIndex(id: OpId): number {
    for (let i = 0; i < this.nodes.length; i++) {
      if (opIdEq(this.nodes[i]!.id, id))
        return i;
    }
    return -1;
  }

  has(id: OpId): boolean {
    return this.nodeIndex(id) !== -1;
  }

  /** Integrate an insert after `originLeft` (`null` = start). Idempotent. */
  integrateInsert(id: OpId, value: T, originLeft: OpId | null): boolean {
    if (this.has(id))
      return true;

    const originIndex = originLeft === null ? -1 : this.nodeIndex(originLeft);
    if (originLeft !== null && originIndex === -1)
      return false; // origin not present yet — caller should buffer

    let i = originIndex + 1;
    while (i < this.nodes.length && compareOpId(this.nodes[i]!.id, id) > 0)
      i += 1;

    this.nodes.splice(i, 0, { id, value, originLeft, deleted: false });
    return true;
  }

  /** Tombstone an element. Idempotent; returns false if the element is unknown. */
  integrateDelete(id: OpId): boolean {
    const index = this.nodeIndex(id);
    if (index === -1)
      return false;

    this.nodes[index]!.deleted = true;
    return true;
  }

  /**
   * Drop tombstoned nodes whose insert is covered by `stable`. Call ONLY at
   * quiescence — when every replica has fully synced and no operations are in
   * flight — otherwise a late op that uses a dropped node as its origin can no
   * longer integrate. `keep` protects ids still referenced elsewhere (e.g. mark
   * span endpoints). Returns the number of nodes removed.
   */
  gc(stable: VersionVector, keep?: (id: OpId) => boolean): number {
    const before = this.nodes.length;
    this.nodes = this.nodes.filter(node =>
      !node.deleted || !stable.has(node.id) || (keep?.(node.id) ?? false));
    return before - this.nodes.length;
  }

  /** Visible values in document order. */
  toArray(): T[] {
    const out: T[] = [];
    for (const node of this.nodes) {
      if (!node.deleted)
        out.push(node.value);
    }
    return out;
  }

  /** Visible nodes in document order (read ids for cursor anchoring). */
  visible(): Array<RgaNode<T>> {
    return this.nodes.filter(node => !node.deleted);
  }

  /** All nodes including tombstones (for state encoding). */
  all(): ReadonlyArray<RgaNode<T>> {
    return this.nodes;
  }

  /** Op id of the visible element at `index`, or `null` if out of range. */
  idAt(index: number): OpId | null {
    return this.visible()[index]?.id ?? null;
  }

  /** Number of visible elements. */
  get length(): number {
    let count = 0;
    for (const node of this.nodes) {
      if (!node.deleted)
        count += 1;
    }
    return count;
  }
}
