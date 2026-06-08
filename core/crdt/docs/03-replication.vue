<!-- title: Replication & Sync -->
<!-- order: 3 -->
<script setup lang="ts">
const opLogShape = `import { OpLog } from '@robonen/crdt';

// The op log only ever reads \`id\` — the rest of the op is your domain payload.
interface CharOp {
  id: { site: string; clock: number };
  originLeft: { site: string; clock: number } | null;
  value: string;
}

const log = new OpLog<CharOp>();

log.append(op);          // true if new, false if already seen (dedup by id)
log.has(op.id);          // version vector lookup, not a linear scan
log.version;             // VersionVector — the highest clock seen per site
log.all();               // every op, in append order
log.delta(remoteVector); // ops the remote (described by its vector) lacks`;

const deltaExample = `// A asks B: "here's everything I've seen" (a state vector).
const aWants = a.replica.version;

// B answers with exactly the ops A is missing — nothing more.
const patch = b.replica.delta(aWants); // OpLog.delta filters by the vector

// A integrates them; ids it already has are silently dropped.
a.replica.receive(patch);`;

const roundTrip = `import { Replica, Rga } from '@robonen/crdt';
import type { OpId } from '@robonen/crdt';

interface CharOp {
  id: OpId;
  originLeft: OpId | null;
  value: string;
}

// Each site owns an RGA (the sequence state) behind a Replica
// (clock + op log + causal buffer + delta sync).
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
    const id = peer.replica.nextId();              // tick the Lamport clock
    peer.replica.commitLocal({ id, originLeft: left, value: ch });
    left = id;
  }
}

const a = makeReplica('a');
const b = makeReplica('b');

// Concurrent, independent edits — neither has seen the other.
type(a, 'Hi');
type(b, 'Yo');

// Exchange ONLY the delta each side is missing, in both directions.
b.replica.receive(a.replica.delta(b.replica.version));
a.replica.receive(b.replica.delta(a.replica.version));

a.rga.toArray().join('') === b.rga.toArray().join(''); // true — converged
a.rga.length; // 4`;

const bufferingExample = `const a = makeReplica('a');
type(a, 'ab'); // two ops; the 2nd inserts after (depends on) the 1st

const b = makeReplica('b');
const [op1, op2] = a.replica.delta(b.replica.version);

// Deliver the DEPENDENT op first. Its origin (op1) isn't present,
// so integrate() returns false and the replica buffers it.
b.replica.receive([op2]);
b.rga.toArray().join(''); // '' — nothing applied yet

// Now deliver the dependency. op1 integrates, which unblocks op2;
// drain() loops until no further progress is possible.
b.replica.receive([op1]);
b.rga.toArray().join(''); // 'ab'`;

const wireExample = `import {
  encodeStateVector, decodeStateVector,
  encodeOps, decodeOps,
} from '@robonen/crdt';

// --- Peer A: announce what I have ---
const myVector: Uint8Array = encodeStateVector(a.replica.version);
socket.send(myVector); // send over WebSocket, HTTP, BroadcastChannel, …

// --- Peer B: answer with the delta A is missing ---
const remoteVector = decodeStateVector(received);
const patch: Uint8Array = encodeOps(b.replica.delta(remoteVector));
socket.send(patch);

// --- Peer A: apply the patch ---
const ops = decodeOps<CharOp>(receivedPatch);
a.replica.receive(ops);`;
</script>

<template>
  <div class="docs-section">
    <!-- Intro -->
    <div class="prose-docs">
      <h1>Replication &amp; Sync</h1>
      <p>
        A CRDT primitive on its own guarantees that the <em>same</em> set of operations converges.
        Replication is the layer that makes sure every replica eventually holds that same set —
        despite messages arriving out of order, twice, or after a long offline gap. This package
        does it without a central server, a global lock, or full-state diffing: each replica keeps
        an append-only op log keyed by a version vector, and the two sides exchange only the
        operations the other is missing.
      </p>
      <p>
        The pieces fit together in one direction. <code>OpLog</code> stores ops and tracks a
        <code>VersionVector</code>; <code>Replica</code> wraps a log plus a Lamport clock and a
        causal buffer, integrating local and remote ops into your domain state; and the
        <code>sync</code> helpers turn version vectors and op batches into bytes for any transport.
      </p>
    </div>

    <!-- Mental model -->
    <div class="prose-docs">
      <h2>The convergence model</h2>
      <p>
        Every operation carries a globally-unique <code>OpId</code> — a per-site
        <a href="https://en.wikipedia.org/wiki/Lamport_timestamp">Lamport</a> clock value tagged
        with the site that produced it (<code>{ site, clock }</code>). Two facts make replication
        work, and both flow from that id:
      </p>
      <ul>
        <li>
          <strong>Identity ⇒ idempotence.</strong> Because an op's id is stable, a replica can tell
          whether it has already seen an op and apply it at most once. Delivering the same op twice
          is a no-op, so duplicate or replayed messages are harmless.
        </li>
        <li>
          <strong>Determinism ⇒ commutativity.</strong> Concurrent ops are resolved by one shared
          tie-break — <NuxtLink to="/crdt/compare-op-id">compareOpId</NuxtLink> (higher clock wins,
          site id breaks ties). Since every replica agrees on it, the order ops arrive in doesn't
          change the final state.
        </li>
      </ul>
      <p>
        Replication therefore reduces to a set-reconciliation problem: <em>get both replicas to the
        same set of ops.</em> Convergence of the resulting state is the primitive's job; getting the
        ops there efficiently is this layer's.
      </p>
    </div>

    <!-- Version vectors -->
    <div class="prose-docs">
      <h3>Version vectors: "what have you seen?"</h3>
      <p>
        A <NuxtLink to="/crdt/version-vector">VersionVector</NuxtLink> is the compact summary of
        everything a replica has observed — a map from site id to the highest clock seen for that
        site. It relies on one assumption: each site emits <strong>dense</strong> clocks
        (1, 2, 3, …), with no gaps. That's what lets a single number per site stand in for a whole
        set: if a replica has seen <code>a@5</code>, it has necessarily seen <code>a@1…a@4</code>
        too. So <code>has(id)</code> is just <code>get(id.site) &gt;= id.clock</code> — an O(1)
        check, no per-op bookkeeping.
      </p>
      <p>
        Two operations follow directly. <strong>Dedup:</strong> an incoming op whose id the vector
        already covers can be ignored. <strong>Delta:</strong> given a remote vector, the set of ops
        the remote lacks is exactly those whose id the vector does <em>not</em> cover.
      </p>
    </div>

    <!-- OpLog -->
    <div class="prose-docs">
      <h2>The op log</h2>
      <p>
        <NuxtLink to="/crdt/op-log">OpLog</NuxtLink> is an append-only list of operations paired
        with a version vector. It is deliberately domain-agnostic: the only field it reads is
        <code>id</code> (the <code>HasOpId</code> constraint), so the same log stores RGA inserts,
        LWW writes, mark spans, or anything else you give it.
      </p>
    </div>
    <DocsCode :code="opLogShape" lang="ts" />
    <div class="prose-docs">
      <p>
        <code>append</code> consults the vector first and returns <code>false</code> if the op is a
        duplicate, so the log never stores the same id twice. <code>delta(remote)</code> walks the
        log once and keeps every op the remote vector hasn't covered — this is the heart of
        "exchange only the delta".
      </p>
    </div>
    <DocsCode :code="deltaExample" lang="ts" />

    <!-- Replica -->
    <div class="prose-docs">
      <h2>The replica</h2>
      <p>
        <NuxtLink to="/crdt/replica">Replica</NuxtLink> ties everything together. It owns a
        <code>LamportClock</code>, an <code>OpLog</code>, and a pending buffer, and you give it a
        single handler — <code>integrate(op)</code> — that applies an op to your domain state and
        returns <code>false</code> when the op's causal dependencies aren't present yet.
      </p>
      <h3>Producing local ops</h3>
      <p>
        Call <code>nextId()</code> to tick the clock and mint a fresh, causally-later
        <code>OpId</code>, build your op around it, then hand it to <code>commitLocal(op)</code>.
        That logs it, integrates it into local state, and notifies <code>onUpdate</code> listeners
        with origin <code>'local'</code>. Because <code>nextId</code> advances a Lamport clock that
        also tracks observed remote ops, locally-generated ids are always ordered after everything
        the replica has seen.
      </p>
      <h3>Receiving remote ops</h3>
      <p>
        <code>receive(ops)</code> is the inbound path. For each op it advances the clock past the
        remote id (<code>clock.observe</code>), skips anything already logged or already buffered,
        then drains the buffer — integrating whatever is now causally ready, retrying until no
        further progress is possible. It returns the ops it actually applied (in apply order) and
        notifies listeners with origin <code>'remote'</code>.
      </p>
      <h3>Computing a delta</h3>
      <p>
        <code>delta(remoteVector)</code> forwards to the log: the ops this replica holds that the
        remote, described by its <code>version</code>, has not seen. The whole round-trip is two
        deltas — one per direction.
      </p>
    </div>

    <!-- Round trip -->
    <div class="prose-docs">
      <h2>The canonical round-trip</h2>
      <p>
        Here is the README's converging-string example expanded end to end. Two replicas type
        concurrently, then each side sends the other exactly the ops it lacks. After both deltas,
        they hold the identical op set and therefore the identical string.
      </p>
    </div>
    <DocsCode :code="roundTrip" lang="ts" />
    <div class="prose-docs">
      <p>
        Note the asymmetry that makes this efficient: <code>a.replica.delta(b.replica.version)</code>
        is computed against <em>B's</em> vector, so it returns only what B is missing — not A's
        entire history. On a long document this is the difference between sending two characters and
        re-sending the whole file.
      </p>
    </div>

    <!-- Why order does not matter -->
    <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
      <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Why the order of the two deltas is irrelevant</h3>
      <p class="text-sm leading-relaxed text-(--fg-muted)">
        You could swap the two <code class="text-(--accent-text)">receive</code> lines, run them
        repeatedly, or interleave them with more edits — the result is the same. Each side only ever
        adds ops it hasn't seen, and <code class="text-(--accent-text)">compareOpId</code> places
        each op in its deterministic position regardless of arrival order. That is convergence,
        and the property tests assert it across randomized schedules.
      </p>
    </div>

    <!-- Causal buffering -->
    <div class="prose-docs">
      <h2>Causal buffering</h2>
      <p>
        Some ops can't be applied the instant they arrive. An RGA insert references an
        <code>originLeft</code> — the element it goes after — and a delete references the element it
        tombstones. If that target hasn't been integrated yet (a later op overtook an earlier one in
        transit), the insert has nowhere to anchor.
      </p>
      <p>
        The handler signals this by returning <code>false</code> from <code>integrate</code>:
        <NuxtLink to="/crdt/rga">Rga</NuxtLink>'s <code>integrateInsert</code> returns
        <code>false</code> when its origin is absent, and <code>integrateDelete</code> returns
        <code>false</code> when its target is unknown. <code>Replica.receive</code> treats a
        <code>false</code> as "not ready yet": it keeps the op in a pending buffer and re-runs the
        buffer every time new ops land, until either the op integrates or its dependency finally
        arrives. Nothing is lost; nothing is applied prematurely.
      </p>
    </div>
    <DocsCode :code="bufferingExample" lang="ts" />
    <div class="prose-docs">
      <p>
        Internally the drain loop sweeps the buffer repeatedly: each successful integration may
        unblock another buffered op, so it keeps looping while it makes progress. This is why a
        single <code>receive</code> of a batch delivered in any order still settles to the right
        state — the buffer absorbs the disorder.
      </p>
    </div>

    <!-- Wire encoding -->
    <div class="prose-docs">
      <h2>Transport-agnostic wire encoding</h2>
      <p>
        The <code>sync</code> module is the only part that touches bytes, and it stays small on
        purpose. There are two things to put on the wire — a version vector (the "what do you have?"
        handshake) and a batch of ops (the delta or a full snapshot) — and a helper for each
        direction:
      </p>
      <ul>
        <li>
          <NuxtLink to="/crdt/encode-state-vector">encodeStateVector</NuxtLink> /
          <code>decodeStateVector</code> — a <code>VersionVector</code> ⇄ <code>Uint8Array</code>.
        </li>
        <li>
          <NuxtLink to="/crdt/encode-ops">encodeOps</NuxtLink> / <code>decodeOps</code> — an op
          batch (the delta or a full snapshot) ⇄ <code>Uint8Array</code>.
        </li>
        <li>
          <code>encodeJson</code> / <code>decodeJson</code> — the lower-level pair the others build on.
        </li>
      </ul>
      <p>
        The v1 format is JSON encoded to bytes — simple and debuggable. A compact varint format is a
        later optimization that changes the bytes, not the API, so code written against these
        functions keeps working. Because the result is just a <code>Uint8Array</code>, the transport
        is entirely up to you: WebSocket, HTTP, <code>BroadcastChannel</code>, a file on disk.
      </p>
    </div>
    <DocsCode :code="wireExample" lang="ts" />

    <!-- A typical sync protocol -->
    <div class="prose-docs">
      <h3>A minimal two-way protocol</h3>
      <p>
        Put the pieces together and a full reconciliation between two peers is four messages:
      </p>
      <ol>
        <li>Each peer sends its <code>encodeStateVector(replica.version)</code>.</li>
        <li>
          On receiving the other's vector, each peer replies with
          <code>encodeOps(replica.delta(theirVector))</code>.
        </li>
        <li>Each peer <code>receive()</code>s the decoded delta.</li>
        <li>Both replicas now hold the same op set — and the same converged state.</li>
      </ol>
      <p>
        This generalizes cleanly. For live collaboration, also forward each locally-committed op as
        it happens (subscribe with <code>onUpdate</code>, encode the op, broadcast it); peers that
        receive an op out of causal order simply buffer it. For catch-up after an offline gap, the
        state-vector handshake above replays exactly the missed ops. The same machinery covers both.
      </p>
    </div>

    <!-- Caveat callout -->
    <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
      <h3 class="mb-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">Dense clocks are a precondition</h3>
      <p class="text-sm leading-relaxed text-(--fg-muted)">
        Version vectors assume each site's clocks are dense (1, 2, 3, …). That holds automatically
        when ids come from <code class="text-(--accent-text)">Replica.nextId()</code>. If you mint
        ids yourself, never skip a value for a site — a gap would make
        <code class="text-(--accent-text)">delta</code> believe a missing op was already delivered.
      </p>
    </div>

    <!-- Where next -->
    <div class="prose-docs">
      <h2>Where to next</h2>
      <ul>
        <li>
          <NuxtLink to="/crdt/replica">Replica</NuxtLink> — the full API reference for
          <code>commitLocal</code>, <code>receive</code>, <code>delta</code>, and
          <code>onUpdate</code>.
        </li>
        <li>
          <NuxtLink to="/crdt/op-log">OpLog</NuxtLink> and
          <NuxtLink to="/crdt/version-vector">VersionVector</NuxtLink> — the storage and causality
          primitives underneath.
        </li>
        <li>
          <NuxtLink to="/crdt/playground">Playground</NuxtLink> — watch two replicas diverge and
          reconcile live in the browser.
        </li>
      </ul>
    </div>
  </div>
</template>
