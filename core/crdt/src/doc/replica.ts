import type { OpId, SiteId, VersionVector } from '../clock';
import { LamportClock, createSiteId, opIdEq } from '../clock';
import type { HasOpId } from '../oplog';
import { OpLog } from '../oplog';

export interface ReplicaHandlers<Op extends HasOpId> {
  /**
   * Apply an op to domain state (RGA, marks, block list, …). Return `false` if
   * its causal dependencies aren't present yet; the replica buffers and retries.
   */
  integrate: (op: Op) => boolean;
}

export type UpdateListener<Op> = (ops: readonly Op[], origin: unknown) => void;

/**
 * Generic op-based CRDT replica: owns a Lamport clock + op log, integrates local
 * and remote ops (with causal buffering and dedup), and exposes deltas for
 * transport-agnostic sync. The domain state lives behind {@link ReplicaHandlers}.
 */
export class Replica<Op extends HasOpId> {
  readonly site: SiteId;
  private readonly clock: LamportClock;
  private readonly log = new OpLog<Op>();
  private readonly pending: Op[] = [];
  private readonly listeners = new Set<UpdateListener<Op>>();

  constructor(private readonly handlers: ReplicaHandlers<Op>, site: SiteId = createSiteId()) {
    this.site = site;
    this.clock = new LamportClock(site);
  }

  /** Next op id for a locally-generated operation. */
  nextId(): OpId {
    return this.clock.tick();
  }

  get version(): VersionVector {
    return this.log.version;
  }

  /** Integrate + log a local op, then notify listeners (origin `'local'`). */
  commitLocal(op: Op): void {
    if (!this.log.append(op))
      return;
    this.handlers.integrate(op);
    this.emit([op], 'local');
  }

  /**
   * Receive remote ops: dedup, buffer until causally ready, integrate, log, and
   * notify with the ops actually applied. Returns the applied ops (in apply order).
   */
  receive(ops: readonly Op[], origin: unknown = 'remote'): Op[] {
    for (const op of ops) {
      this.clock.observe(op.id);
      if (!this.log.has(op.id) && !this.pending.some(p => opIdEq(p.id, op.id)))
        this.pending.push(op);
    }

    const applied = this.drain();
    if (applied.length > 0)
      this.emit(applied, origin);
    return applied;
  }

  private drain(): Op[] {
    const applied: Op[] = [];
    let progressed = true;

    while (this.pending.length > 0 && progressed) {
      progressed = false;
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const op = this.pending[i]!;
        if (this.handlers.integrate(op)) {
          this.log.append(op);
          this.pending.splice(i, 1);
          applied.push(op);
          progressed = true;
        }
      }
    }

    return applied;
  }

  /** Ops a remote replica (described by its version vector) is missing. */
  delta(remote: VersionVector): Op[] {
    return this.log.delta(remote);
  }

  /** Subscribe to applied ops (local + remote). Returns an unsubscribe fn. */
  onUpdate(listener: UpdateListener<Op>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(ops: readonly Op[], origin: unknown): void {
    for (const listener of this.listeners)
      listener(ops, origin);
  }
}
