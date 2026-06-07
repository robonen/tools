import { describe, expect, it } from 'vitest';
import type { OpId } from '../../clock';
import { VersionVector, opId, opIdEq } from '../../clock';
import { Rga } from '..';

type Op
  = | { kind: 'insert'; id: OpId; value: string; originLeft: OpId | null }
    | { kind: 'delete'; id: OpId };

/** Apply ops in the given order, buffering and retrying any whose causal deps aren't met. */
function applyAll(rga: Rga<string>, ops: readonly Op[]): void {
  const pending = [...ops];
  let progressed = true;

  while (pending.length > 0 && progressed) {
    progressed = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const op = pending[i]!;
      const applied = op.kind === 'insert'
        ? rga.integrateInsert(op.id, op.value, op.originLeft)
        : rga.integrateDelete(op.id);
      if (applied) {
        pending.splice(i, 1);
        progressed = true;
      }
    }
  }
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xFFFFFFFF;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

describe('rga', () => {
  it('orders concurrent inserts at the same origin higher-op-id-first', () => {
    const opA: Op = { kind: 'insert', id: opId('a', 1), value: 'X', originLeft: null };
    const opB: Op = { kind: 'insert', id: opId('b', 1), value: 'Y', originLeft: null };

    const first = new Rga<string>();
    applyAll(first, [opA, opB]);
    const second = new Rga<string>();
    applyAll(second, [opB, opA]);

    expect(first.toArray()).toEqual(['Y', 'X']); // site 'b' > 'a' at equal clock
    expect(second.toArray()).toEqual(first.toArray());
  });

  it('is idempotent under re-applied ops', () => {
    const rga = new Rga<string>();
    const op: Op = { kind: 'insert', id: opId('a', 1), value: 'X', originLeft: null };
    applyAll(rga, [op, op, op]);
    expect(rga.toArray()).toEqual(['X']);
  });

  it('converges across two replicas for random concurrent ops + deletes', () => {
    for (let trial = 0; trial < 25; trial++) {
      const rng = seeded(trial + 1);
      const sites = ['a', 'b', 'c'];
      const counters: Record<string, number> = { a: 0, b: 0, c: 0 };
      const inserted: Array<{ id: OpId; value: string }> = [];
      const ops: Op[] = [];

      for (let i = 0; i < 40; i++) {
        const site = sites[Math.floor(rng() * sites.length)]!;
        const makeDelete = inserted.length > 0 && rng() < 0.25;

        if (makeDelete) {
          const target = inserted[Math.floor(rng() * inserted.length)]!;
          ops.push({ kind: 'delete', id: target.id });
        }
        else {
          counters[site] = counters[site]! + 1;
          const id = opId(site, counters[site]!);
          const originLeft = inserted.length > 0 && rng() < 0.8
            ? inserted[Math.floor(rng() * inserted.length)]!.id
            : null;
          ops.push({ kind: 'insert', id, value: `${site}${counters[site]}`, originLeft });
          inserted.push({ id, value: `${site}${counters[site]}` });
        }
      }

      const replicaOrder = new Rga<string>();
      applyAll(replicaOrder, ops);

      const replicaShuffled = new Rga<string>();
      applyAll(replicaShuffled, shuffle(ops, rng));

      expect(replicaShuffled.toArray()).toEqual(replicaOrder.toArray());
    }
  });

  it('gc drops stable tombstones, keeps live/protected/unstable ones', () => {
    const rga = new Rga<string>();
    applyAll(rga, [
      { kind: 'insert', id: opId('a', 1), value: 'a', originLeft: null },
      { kind: 'insert', id: opId('a', 2), value: 'b', originLeft: opId('a', 1) },
      { kind: 'insert', id: opId('a', 3), value: 'c', originLeft: opId('a', 2) },
    ]);
    rga.integrateDelete(opId('a', 2)); // tombstone 'b'
    rga.integrateDelete(opId('a', 3)); // tombstone 'c'
    expect(rga.toArray().join('')).toBe('a');

    const stable = new VersionVector();
    stable.observe(opId('a', 2)); // only ops up to a@2 are stable everywhere

    // a@2 tombstone is dropped; a@3 is unstable (kept); 'c' protected via keep.
    const removed = rga.gc(stable, id => opIdEq(id, opId('a', 3)));
    expect(removed).toBe(1);
    expect(rga.has(opId('a', 2))).toBe(false);
    expect(rga.has(opId('a', 3))).toBe(true);
    expect(rga.has(opId('a', 1))).toBe(true); // live, never dropped
    expect(rga.toArray().join('')).toBe('a');
  });
});
