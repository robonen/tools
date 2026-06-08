/** A replica identifier — unique per editing site/session. */
export type SiteId = string;

/** A globally-unique operation id: a per-site Lamport counter tagged with the site. */
export interface OpId {
  readonly site: SiteId;
  readonly clock: number;
}

export function opId(site: SiteId, clock: number): OpId {
  return { site, clock };
}

export function opIdEq(a: OpId, b: OpId): boolean {
  return a.clock === b.clock && a.site === b.site;
}

/**
 * Total order over op ids: higher clock wins; ties broken by site id. This is
 * the deterministic tie-break every replica agrees on, so LWW and RGA converge.
 */
export function compareOpId(a: OpId, b: OpId): number {
  if (a.clock !== b.clock)
    return a.clock - b.clock;
  return a.site < b.site ? -1 : a.site > b.site ? 1 : 0;
}

export function opIdToString(id: OpId): string {
  return `${id.site}@${id.clock}`;
}

/** Generate a random site id (no crypto dependency; uniqueness, not secrecy). */
export function createSiteId(): SiteId {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}
