import type { OpId, SiteId } from './id';

/**
 * Tracks the highest clock seen per site, assuming each site emits dense clocks
 * (1, 2, 3, …). Used to deduplicate ops and to compute deltas during sync.
 */
export class VersionVector {
  private readonly clocks = new Map<SiteId, number>();

  /** Record that an op has been seen. */
  observe(id: OpId): void {
    if (id.clock > this.get(id.site))
      this.clocks.set(id.site, id.clock);
  }

  /** Highest clock seen for a site (0 if none). */
  get(site: SiteId): number {
    return this.clocks.get(site) ?? 0;
  }

  /** Whether an op id has already been seen. */
  has(id: OpId): boolean {
    return this.get(id.site) >= id.clock;
  }

  /** Plain-object snapshot for transport. */
  toJSON(): Record<SiteId, number> {
    return Object.fromEntries(this.clocks);
  }

  static fromJSON(snapshot: Record<SiteId, number>): VersionVector {
    const vv = new VersionVector();
    for (const site in snapshot)
      vv.clocks.set(site, snapshot[site]!);
    return vv;
  }

  clone(): VersionVector {
    return VersionVector.fromJSON(this.toJSON());
  }
}
