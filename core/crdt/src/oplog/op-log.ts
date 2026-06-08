import type { OpId } from '../clock';
import { VersionVector } from '../clock';

/** Anything carrying an op id can live in the log. */
export interface HasOpId {
  readonly id: OpId;
}

/**
 * An append-only log of operations with a version vector for deduplication and
 * delta computation. The op shape is domain-specific; the log only reads `id`.
 */
export class OpLog<Op extends HasOpId> {
  private readonly ops: Op[] = [];
  private readonly vv = new VersionVector();

  /** Append an op unless already seen. Returns `true` if appended. */
  append(op: Op): boolean {
    if (this.vv.has(op.id))
      return false;

    this.ops.push(op);
    this.vv.observe(op.id);
    return true;
  }

  has(id: OpId): boolean {
    return this.vv.has(id);
  }

  get version(): VersionVector {
    return this.vv;
  }

  all(): readonly Op[] {
    return this.ops;
  }

  /** Ops a remote replica (described by its version vector) hasn't seen. */
  delta(remote: VersionVector): Op[] {
    return this.ops.filter(op => !remote.has(op.id));
  }
}
