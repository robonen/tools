<!-- title: Concepts -->
<!-- order: 1 -->
<script setup lang="ts">
const opIdSrc = `import { opId, opIdEq, opIdToString, createSiteId } from '@robonen/crdt';

// An OpId is just { site, clock } — a per-site Lamport counter
// tagged with the site that produced it.
const id = opId('alice', 3); // { site: 'alice', clock: 3 }

opIdToString(id);           // 'alice@3'
opIdEq(id, opId('alice', 3)); // true

// A site id is a per-replica handle. Generate one when a session starts.
const site = createSiteId(); // e.g. 'k3f9a2d1xz'`;

const lamportSrc = `import { LamportClock } from '@robonen/crdt';

const clock = new LamportClock('alice');

clock.tick(); // { site: 'alice', clock: 1 }
clock.tick(); // { site: 'alice', clock: 2 }

// We hear about a remote op from 'bob' at clock 5.
clock.observe({ site: 'bob', clock: 5 });

// Our next local id jumps past it, so it's causally *after* what we've seen.
clock.tick(); // { site: 'alice', clock: 6 }`;

const compareSrc = `import { compareOpId, opId } from '@robonen/crdt';

// Higher clock wins.
compareOpId(opId('alice', 1), opId('alice', 2)); // < 0  (2 is greater)

// Equal clocks → site id breaks the tie, deterministically.
compareOpId(opId('alice', 2), opId('bob', 2));   // < 0  ('alice' < 'bob')
compareOpId(opId('bob', 2),   opId('alice', 2)); // > 0

// Identical ids compare equal.
compareOpId(opId('alice', 2), opId('alice', 2)); // 0`;

const vvSrc = `import { VersionVector, opId } from '@robonen/crdt';

const vv = new VersionVector();
vv.observe(opId('alice', 3));
vv.observe(opId('bob', 1));

// "Have I already seen this op?" — the basis for dedup.
vv.has(opId('alice', 2)); // true  (we've seen alice up to 3)
vv.has(opId('alice', 3)); // true
vv.has(opId('alice', 4)); // false (not yet)
vv.has(opId('carol', 1)); // false (never heard from carol)

// Highest dense clock per site (0 if a site is unknown).
vv.get('alice'); // 3
vv.get('carol'); // 0`;

const vvWireSrc = `import { VersionVector, opId } from '@robonen/crdt';

const local = new VersionVector();
local.observe(opId('alice', 5));
local.observe(opId('bob', 2));

// Snapshot for transport: a plain { site: clock } object.
const snapshot = local.toJSON(); // { alice: 5, bob: 2 }

// The other side reconstructs it and compares against its own log
// to compute exactly which ops you're missing.
const remoteKnows = VersionVector.fromJSON(snapshot);
remoteKnows.has(opId('alice', 4)); // true  → skip it
remoteKnows.has(opId('alice', 6)); // false → send it`;

const propsSrc = `// Commutative — order of application doesn't matter:
//   apply(apply(s, x), y) === apply(apply(s, y), x)
//
// Idempotent — re-applying a seen op is a no-op:
//   apply(s, x) === apply(apply(s, x), x)
//
// Convergent — same op SET ⇒ same state, regardless of how it got there.
//
// These three together mean a network that reorders, duplicates, and
// delays messages can never push two replicas to different states.`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>Concepts</h1>
      <p>
        Every primitive in <code>@robonen/crdt</code> rests on one small idea: if all replicas agree on a
        <strong>deterministic total order</strong> over operations, then applying the same set of operations
        — in any order, with duplicates, after any delay — always produces the same state. This page builds
        that mental model from the ground up: sites and replicas, Lamport clocks and op ids, the single
        tie-break that resolves every conflict, version vectors for deduplication and deltas, and the three
        algebraic properties that make convergence inevitable rather than hopeful.
      </p>
    </div>

    <div class="prose-docs">
      <h2>Replicas and sites</h2>
      <p>
        A <strong>replica</strong> is one copy of the shared state — a browser tab, a mobile app, a server
        process. Each replica is owned by exactly one <strong>site</strong>, identified by a
        <code>SiteId</code> (just a string). The site id is the thing that makes one replica distinguishable
        from every other, so it must be unique across all participants. Use <code>createSiteId</code> to mint
        one when a session begins; it trades on randomness for uniqueness, not secrecy, so there's no crypto
        dependency.
      </p>
      <p>
        Replicas never share mutable memory. They evolve independently and communicate only by exchanging
        <strong>operations</strong> — small, self-describing facts like "insert this character" or "set this
        key". The whole job of a CRDT is to make sure that once two replicas have seen the same operations,
        they hold the same state, no matter what the network did to the messages in between.
      </p>
    </div>

    <div class="prose-docs">
      <h2>Op ids: naming every operation</h2>
      <p>
        For replicas to talk about the same operation — to deduplicate it, to refer to it as a causal
        dependency, to break ties against it — every operation needs a stable, globally unique name. That
        name is an <code>OpId</code>: a per-site counter (its Lamport <code>clock</code>) tagged with the
        <code>site</code> that produced it.
      </p>
    </div>
    <DocsCode :code="opIdSrc" lang="ts" />
    <div class="prose-docs">
      <p>
        Because the counter is local to a site and the id carries that site, two replicas can generate ids
        completely independently and never collide. There's no coordination, no central allocator, no UUID
        round-trips — uniqueness falls out of the structure. <code>opIdToString</code> gives the canonical
        <code>site@clock</code> form, handy as a map key or for logging.
      </p>
    </div>

    <div class="prose-docs">
      <h2>Lamport clocks: encoding causality</h2>
      <p>
        A bare per-site counter is unique, but it isn't enough to compare two operations from different
        sites in a meaningful way. <code>LamportClock</code> fixes that. It hands out monotonically
        increasing ids via <code>tick()</code>, and — crucially — it <code>observe()</code>s the clocks of
        remote operations it learns about, jumping its own counter ahead so that anything it produces next is
        numbered <em>after</em> what it has already seen.
      </p>
    </div>
    <DocsCode :code="lamportSrc" lang="ts" />
    <div class="prose-docs">
      <p>
        This is the Lamport <em>happens-before</em> rule in miniature: if operation
        <strong>A</strong> causally precedes <strong>B</strong> (B was generated by a replica that had
        already seen A), then A's clock is strictly less than B's. The converse isn't guaranteed — two ops
        with unrelated clocks may simply be <strong>concurrent</strong>, produced by replicas that hadn't yet
        heard from each other. That's fine, and expected: concurrency is exactly the situation a CRDT exists
        to resolve.
      </p>
    </div>

    <div class="prose-docs">
      <h2>compareOpId: the one tie-break</h2>
      <p>
        Lamport clocks give a <em>partial</em> order — they leave concurrent operations incomparable. But to
        converge, every replica must agree on a single <strong>total</strong> order so that any two
        operations can be ranked the same way everywhere. <code>compareOpId</code> is that total order, and it
        is the only conflict-resolution rule in the entire library:
      </p>
      <ul>
        <li><strong>Higher clock wins.</strong> A later operation supersedes an earlier one.</li>
        <li>
          <strong>Site id breaks ties.</strong> When two ops share a clock (they were concurrent), the
          string comparison of their site ids picks a winner — arbitrary, but identical on every replica.
        </li>
      </ul>
    </div>
    <DocsCode :code="compareSrc" lang="ts" />
    <div class="prose-docs">
      <p>
        That second rule is the quiet hero of the whole design. The choice of winner doesn't matter; what
        matters is that <em>every replica makes the same choice</em>. Because site ids are unique and string
        comparison is deterministic, two replicas resolving the same concurrent edit will always pick the
        same survivor. That single shared decision is what lets a last-writer-wins register and a sequence
        CRDT, built by different code, nonetheless agree on the final document.
      </p>
      <div class="my-4 rounded-lg border border-(--border) bg-(--bg-subtle) p-4">
        <p class="m-0 text-sm leading-relaxed text-(--fg-muted)">
          <strong class="text-(--fg)">Why one rule for everything?</strong>
          <code class="text-(--accent-text)">LwwRegister</code> uses
          <code class="text-(--accent-text)">compareOpId</code> to pick the surviving value;
          <code class="text-(--accent-text)">Rga</code> uses it to break ties between concurrent inserts at
          the same position; <code class="text-(--accent-text)">MarkStore</code> uses it to decide which
          formatting wins per character. One total order, applied consistently, is what turns a pile of
          independent primitives into a coherent, converging system.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Version vectors: who has seen what</h2>
      <p>
        Op ids order operations; a <code>VersionVector</code> summarizes <em>which</em> operations a replica
        has seen. It maps each known site to the highest clock observed from it. Its power comes from one
        assumption: per-site clocks are <strong>dense</strong> — a site emits <code>1, 2, 3, …</code> with no
        gaps. Given that, "highest clock seen from site X" implies "every op from X up to that clock has been
        seen", so a single integer per site captures the entire causal history.
      </p>
    </div>
    <DocsCode :code="vvSrc" lang="ts" />
    <div class="prose-docs">
      <h3>Deduplication</h3>
      <p>
        Networks redeliver. Because operations are idempotent (more on that below), re-applying one is
        harmless — but <code>vv.has(id)</code> lets you skip the work entirely. If the vector already covers
        an op's site and clock, you've seen it; drop it before it ever touches your state. This is the first
        line of defense that keeps duplicate messages from doing anything observable.
      </p>
      <h3>Deltas</h3>
      <p>
        The same vector drives efficient sync. When a peer tells you its version vector, you compare it
        against your own op log and send back <em>only</em> the operations it's missing — never the whole
        document. A site with clock <code>4</code> in their vector but <code>9</code> in yours means ops
        <code>5</code> through <code>9</code> are the delta. Version vectors are tiny and serialize to a plain
        <code>{ site: clock }</code> object, so they're cheap to ship as the "here's what I have" handshake.
      </p>
    </div>
    <DocsCode :code="vvWireSrc" lang="ts" />
    <div class="prose-docs">
      <div class="my-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p class="m-0 text-sm leading-relaxed text-(--fg-muted)">
          <strong class="text-amber-700 dark:text-amber-400">Density matters.</strong>
          <code class="text-(--accent-text)">VersionVector</code> only works because clocks arrive without
          gaps. If you generate ids with a raw <code class="text-(--accent-text)">LamportClock</code>, deliver
          them in order per site (the <code class="text-(--accent-text)">Replica</code>'s causal buffer does
          this for you) so a single high-water mark per site can stand in for the full set of seen ops.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>The three properties</h2>
      <p>
        Everything above exists to guarantee three algebraic properties of operations. They're the formal
        promise behind "it just converges", and they're verified by property tests across the package.
      </p>
    </div>
    <DocsCode :code="propsSrc" lang="ts" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Commutative</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          Order of application doesn't change the result. A replica can integrate operations as they arrive,
          in whatever sequence the network delivers them.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Idempotent</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          Applying the same operation twice is the same as applying it once. Redelivery and retries are safe;
          version vectors make them free.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Convergent</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          Same set of operations, same final state — full stop. Two replicas that have seen the same ops are
          byte-for-byte identical.
        </p>
      </div>
    </div>
    <div class="prose-docs">
      <p>
        Commutativity and idempotency are <em>local</em> properties of how a single replica integrates an
        operation. Convergence is the <em>global</em> consequence: if integration is both order-independent
        and duplicate-safe, then the state of a replica is a pure function of the <em>set</em> of operations
        it has seen, with no dependence on path or timing. That's why a CRDT tolerates the worst a network
        can do — reordering, duplication, partition, arbitrary delay — and still lands every participant on
        the same document.
      </p>
    </div>

    <div class="prose-docs">
      <h2>Putting it together</h2>
      <p>
        With the model in hand, the rest of the library reads as direct applications of it. The same
        <code>OpId</code> that names an operation is the value <code>compareOpId</code> ranks; the same
        Lamport clock that produced it advances when you observe a peer; the same dense clocks that make ids
        unique make version vectors a one-integer-per-site summary. From here:
      </p>
      <ul>
        <li>
          <NuxtLink to="/crdt/primitives">Primitives</NuxtLink> — see the order in action across
          <NuxtLink to="/crdt/rga">Rga</NuxtLink>, <NuxtLink to="/crdt/lww-register">LwwRegister</NuxtLink>,
          and fractional indexing with <NuxtLink to="/crdt/key-between">keyBetween</NuxtLink>.
        </li>
        <li>
          <NuxtLink to="/crdt/replication">Replication &amp; Sync</NuxtLink> — how
          <NuxtLink to="/crdt/replica">Replica</NuxtLink> wires a clock, op log, and causal buffer into
          version-vector deltas.
        </li>
        <li>
          <NuxtLink to="/crdt/playground">Playground</NuxtLink> — watch two replicas diverge and reconcile,
          live in the browser.
        </li>
      </ul>
    </div>
  </div>
</template>
