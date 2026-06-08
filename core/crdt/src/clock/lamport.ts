import type { OpId, SiteId } from './id';

/**
 * A Lamport clock for one site: hands out monotonically increasing op ids and
 * advances past observed remote ops so locally-generated ids stay causally later.
 */
export class LamportClock {
  private counter: number;

  constructor(public readonly site: SiteId, start = 0) {
    this.counter = start;
  }

  /** Generate the next op id for a local operation. */
  tick(): OpId {
    this.counter += 1;
    return { site: this.site, clock: this.counter };
  }

  /** Advance past a remote op so future local ticks are causally after it. */
  observe(id: OpId): void {
    if (id.clock > this.counter)
      this.counter = id.clock;
  }

  get value(): number {
    return this.counter;
  }
}
