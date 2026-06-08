<script setup lang="ts">
const replicaExample = `import { Replica, Rga, opId } from '@robonen/crdt';

// Each editing site owns an RGA (the sequence state) wrapped by a Replica
// (clock + op log + causal buffering + delta sync).
type Op = {
  id: ReturnType<typeof opId>;
  value: string;
  originLeft: ReturnType<typeof opId> | null;
};

function makeReplica(site: string) {
  const rga = new Rga<string>();
  const replica = new Replica<Op>(
    { integrate: op => rga.integrateInsert(op.id, op.value, op.originLeft) },
    site,
  );
  return { rga, replica };
}

const a = makeReplica('a');
const b = makeReplica('b');

// A types "hi" locally.
let left: Op['originLeft'] = null;
for (const ch of 'hi') {
  const op: Op = { id: a.replica.nextId(), value: ch, originLeft: left };
  a.replica.commitLocal(op);
  left = op.id;
}

// Sync: send B only the ops it is missing, then send A only what it lacks.
b.replica.receive(a.replica.delta(b.replica.version));
a.replica.receive(b.replica.delta(a.replica.version));

a.rga.toArray().join(''); // 'hi'
a.rga.toArray().join('') === b.rga.toArray().join(''); // true — converged`;
</script>

<template>
  <div class="docs-section">
    <!-- Hero -->
    <div class="prose-docs">
      <h1>@robonen/crdt</h1>
      <p>
        Framework-agnostic CRDT primitives — an RGA sequence, last-writer-wins registers,
        fractional indexing, and version vectors that converge no matter the order, duplicates,
        or delays in which operations arrive.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Collaborative state is hard because two replicas can edit the same document at once,
        offline, with messages that arrive out of order or twice. A CRDT solves this by construction:
        every primitive here is <strong>commutative, idempotent, and convergent</strong>, so applying
        the same set of operations in any order yields the same state — a property verified by
        property tests. It's the convergence engine behind <code>@robonen/editor</code>, but stays
        fully domain-agnostic, ships zero runtime dependencies, and runs in both Node and the browser.
      </p>
    </div>

    <!-- Feature cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Convergent by construction</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          One deterministic tie-break — <code class="text-(--accent-text)">compareOpId</code> (higher
          Lamport clock wins; site id breaks ties) — is shared by every primitive, so LWW and RGA agree
          on the same final state.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Causal buffering built in</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          <code class="text-(--accent-text)">Replica.receive</code> dedups, holds ops whose dependencies
          haven't arrived yet (an insert before its origin), and retries them automatically as they land.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Delta sync, not full state</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          Version vectors let each side request exactly the ops it's missing via
          <code class="text-(--accent-text)">delta(version)</code>, with a transport-agnostic wire format.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Zero dependencies, pure TS</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          No runtime deps, no framework lock-in. Compose the primitives yourself, or lean on
          <code class="text-(--accent-text)">Replica</code> to tie a clock, op log, and buffer together.
        </p>
      </div>
    </div>

    <!-- Install -->
    <div class="prose-docs">
      <h2>Install</h2>
      <p>Add the package with your preferred package manager.</p>
    </div>
    <DocsCode :code="`pnpm add @robonen/crdt`" lang="bash" />

    <!-- Usage -->
    <div class="prose-docs">
      <h2>Quick start</h2>
      <p>
        Two replicas edit a string independently, then exchange only the operations each is missing
        and converge to the same result.
      </p>
    </div>
    <DocsCode :code="replicaExample" lang="ts" />

    <!-- Where next -->
    <div class="prose-docs">
      <h2>Where to next</h2>
      <p>New to CRDTs? Work through the guide and finish in the live playground.</p>
      <ul>
        <li>
          <NuxtLink to="/crdt/concepts">Concepts</NuxtLink> — op ids, Lamport clocks, version vectors,
          and why convergence holds.
        </li>
        <li>
          <NuxtLink to="/crdt/primitives">Primitives</NuxtLink> — a tour of
          <NuxtLink to="/crdt/rga">Rga</NuxtLink>,
          <NuxtLink to="/crdt/lww-register">LwwRegister</NuxtLink>, and fractional indexing with
          <NuxtLink to="/crdt/key-between">keyBetween</NuxtLink>.
        </li>
        <li>
          <NuxtLink to="/crdt/replication">Replication &amp; Sync</NuxtLink> — wiring up
          <NuxtLink to="/crdt/replica">Replica</NuxtLink>, deltas, and the wire encoding.
        </li>
        <li>
          <NuxtLink to="/crdt/playground">Playground</NuxtLink> — watch two replicas diverge and
          reconcile, live in the browser.
        </li>
      </ul>
    </div>
  </div>
</template>
