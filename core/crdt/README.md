# @robonen/crdt

Framework-agnostic CRDT primitives — the convergence engine behind `@robonen/editor`, usable on their own. Zero runtime dependencies; pure TypeScript; runs in Node and the browser.

Every primitive is built so that **applying the same set of operations in any order, with duplicates, yields the same state** (commutative, idempotent, convergent), verified by property tests.

## Primitives

| Module | Exports | Purpose |
| --- | --- | --- |
| `clock` | `OpId`, `LamportClock`, `VersionVector`, `compareOpId`, `createSiteId` | Causality: per-site Lamport ids with a deterministic total order; version vectors for dedup + deltas. |
| `registers` | `LwwRegister`, `LwwMap` | Last-writer-wins values / maps (conflict resolved by op id). |
| `ordering` | `keyBetween`, `keysBetween` | Fractional indexing — place an item strictly between two neighbors (or move it) with one string key. |
| `sequence` | `Rga` | Replicated Growable Array — a sequence CRDT with tombstones, higher-op-id-first tie-break, causal-buffering API. |
| `marks` | `MarkStore`, `MarkSpan`, `MarkValue` | Lightweight Peritext: formatting spans anchored to character op ids, resolved per character by highest op id. |
| `oplog` | `OpLog` | Append-only op log with a version vector; computes deltas. |
| `sync` | `encodeStateVector`, `encodeDelta`/`encodeOps`, `decode*` | Transport-agnostic wire encoding (JSON-over-bytes in v1). |
| `doc` | `Replica` | Ties a clock + op log + causal buffer together; integrates local/remote ops and exposes deltas. |

## Example: a converging replicated string

```ts
import { Replica, Rga, opId } from '@robonen/crdt';

function makeReplica(site: string) {
  const rga = new Rga<string>();
  const replica = new Replica<{ id: ReturnType<typeof opId>; originLeft: ReturnType<typeof opId> | null; value: string }>(
    { integrate: op => rga.integrateInsert(op.id, op.value, op.originLeft) },
    site,
  );
  return { rga, replica };
}

const a = makeReplica('a');
const b = makeReplica('b');

// ... A and B make concurrent local edits via replica.commitLocal(...) ...

// Exchange only what each side is missing:
b.replica.receive(a.replica.delta(b.replica.version));
a.replica.receive(b.replica.delta(a.replica.version));

a.rga.toArray().join('') === b.rga.toArray().join(''); // true — converged
```

`Replica.receive` buffers ops whose causal dependencies haven't arrived yet (an insert before its origin, a delete before its target) and retries them automatically.

## Notes

- `compareOpId` is the single deterministic tie-break (higher clock wins; site id breaks ties) every primitive agrees on — that's what makes LWW and RGA converge.
- `VersionVector` assumes **dense** per-site clocks (1, 2, 3, …).
- The v1 wire format is JSON encoded to bytes — simple and debuggable; a compact varint format is a later optimization with no API change.
- An editor-specific composition of these primitives (blocks + text + marks ↔ editor steps) lives in `@robonen/editor` under `crdt/native/`, not here — this package stays domain-agnostic.

## Development

```bash
pnpm --filter @robonen/crdt test    # property/convergence tests
pnpm --filter @robonen/crdt build   # tsdown (ESM + CJS + dts)
```
