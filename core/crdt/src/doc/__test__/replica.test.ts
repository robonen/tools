import { describe, expect, it } from 'vitest';
import type { OpId } from '../../clock';
import { Rga } from '../../sequence';
import { Replica } from '..';

interface CharOp {
  id: OpId;
  originLeft: OpId | null;
  value: string;
}

function makeReplica(site: string) {
  const rga = new Rga<string>();
  const replica = new Replica<CharOp>(
    { integrate: op => rga.integrateInsert(op.id, op.value, op.originLeft) },
    site,
  );
  return { rga, replica };
}

function type(peer: ReturnType<typeof makeReplica>, text: string): void {
  let left: OpId | null = null;
  for (const ch of text) {
    const id = peer.replica.nextId();
    peer.replica.commitLocal({ id, originLeft: left, value: ch });
    left = id;
  }
}

describe('replica', () => {
  it('two replicas converge after exchanging deltas', () => {
    const a = makeReplica('a');
    const b = makeReplica('b');

    type(a, 'Hi'); // concurrent edits
    type(b, 'Yo');

    // Exchange only what each side is missing (delta by version vector).
    b.replica.receive(a.replica.delta(b.replica.version));
    a.replica.receive(b.replica.delta(a.replica.version));

    expect(a.rga.toArray().join('')).toBe(b.rga.toArray().join(''));
    expect(a.rga.length).toBe(4);
  });

  it('buffers a remote op until its causal dependency arrives, then applies both', () => {
    const a = makeReplica('a');
    type(a, 'ab'); // two ops; the 2nd depends on the 1st

    const b = makeReplica('b');
    const [op1, op2] = a.replica.delta(b.replica.version) as CharOp[];

    // Deliver the dependent op first — it must buffer.
    b.replica.receive([op2!]);
    expect(b.rga.toArray().join('')).toBe('');

    // Now deliver the dependency — both integrate.
    b.replica.receive([op1!]);
    expect(b.rga.toArray().join('')).toBe('ab');
  });
});
