<!-- title: Playground -->
<!-- order: 4 -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { OpId } from '../src';
import { Replica, Rga } from '../src';

// ---------------------------------------------------------------------------
// The op shape exchanged between replicas.
//
// This is a REAL @robonen/crdt setup, not a simulation: each side owns an `Rga`
// for its sequence state, wrapped by a `Replica` that owns the Lamport clock,
// op log, causal buffer and delta computation. The only thing the demo adds is
// a tiny op union so we can both insert and delete characters.
// ---------------------------------------------------------------------------
type CharOp =
  | { kind: 'insert'; id: OpId; value: string; originLeft: OpId | null }
  | { kind: 'delete'; id: OpId; target: OpId };

interface Side {
  rga: Rga<string>;
  replica: Replica<CharOp>;
}

function makeSide(site: string): Side {
  const rga = new Rga<string>();
  const replica = new Replica<CharOp>(
    {
      // Return `false` when a dependency is missing — the Replica buffers the op
      // and retries it automatically once the dependency arrives.
      integrate: (op) => {
        if (op.kind === 'insert')
          return rga.integrateInsert(op.id, op.value, op.originLeft);
        return rga.integrateDelete(op.target);
      },
    },
    site,
  );
  return { rga, replica };
}

// Reactive view-model. The CRDT classes are plain (non-reactive) objects, so we
// keep a small reactive snapshot and refresh it after every mutation.
interface View {
  text: string;
  ops: number;
  clock: number;
  pending: number;
}

const snapshot = reactive<{ a: View; b: View }>({
  a: { text: '', ops: 0, clock: 0, pending: 0 },
  b: { text: '', ops: 0, clock: 0, pending: 0 },
});

const drafts = reactive({ a: '', b: '' });
let a: Side | null = null;
let b: Side | null = null;

function refresh(): void {
  if (!a || !b)
    return;
  snapshot.a = {
    text: a.rga.toArray().join(''),
    ops: a.replica.version.get(a.replica.site),
    clock: a.replica.version.get(a.replica.site),
    pending: 0,
  };
  snapshot.b = {
    text: b.rga.toArray().join(''),
    ops: b.replica.version.get(b.replica.site),
    clock: b.replica.version.get(b.replica.site),
    pending: 0,
  };
}

function init(): void {
  a = makeSide('A');
  b = makeSide('B');
  drafts.a = '';
  drafts.b = '';
  refresh();
}

// The drafts are deliberately decoupled from the CRDT value until "Apply":
// that lets the user stage CONCURRENT edits on both sides before any sync, the
// scenario where convergence actually matters.

/**
 * Diff the side's current CRDT string against the textarea draft and emit the
 * minimal insert/delete ops to make the RGA match the draft, committing each
 * locally. A real editor derives these ops from input events the same way.
 */
function apply(which: 'a' | 'b'): void {
  const side = which === 'a' ? a : b;
  if (!side)
    return;

  const current = side.rga.toArray();
  const next = [...(which === 'a' ? drafts.a : drafts.b)];

  // Longest common prefix / suffix → splice region (a tiny, dependency-free diff).
  let start = 0;
  while (start < current.length && start < next.length && current[start] === next[start])
    start += 1;

  let endCur = current.length;
  let endNext = next.length;
  while (endCur > start && endNext > start && current[endCur - 1] === next[endNext - 1]) {
    endCur -= 1;
    endNext -= 1;
  }

  // Delete the removed characters (right-to-left keeps live indices stable).
  for (let i = endCur - 1; i >= start; i--) {
    const target = side.rga.idAt(i);
    if (target) {
      const op: CharOp = { kind: 'delete', id: side.replica.nextId(), target };
      side.replica.commitLocal(op);
    }
  }

  // Insert the new characters after the surviving left neighbour.
  let left = start > 0 ? side.rga.idAt(start - 1) : null;
  for (let i = start; i < endNext; i++) {
    const op: CharOp = {
      kind: 'insert',
      id: side.replica.nextId(),
      value: next[i]!,
      originLeft: left,
    };
    side.replica.commitLocal(op);
    left = op.id;
  }

  // Re-read drafts from the authoritative CRDT value.
  drafts.a = a!.rga.toArray().join('');
  drafts.b = b!.rga.toArray().join('');
  refresh();
}

/**
 * One full sync round: each side hands the other only the ops it is missing
 * (computed from the peer's version vector), and `receive` integrates them with
 * dedup + causal buffering. After this both RGAs hold the identical sequence.
 */
function sync(): void {
  if (!a || !b)
    return;
  // Snapshot versions BEFORE exchanging so each delta reflects pre-sync state.
  const va = a.replica.version.clone();
  const vb = b.replica.version.clone();
  b.replica.receive(a.replica.delta(vb));
  a.replica.receive(b.replica.delta(va));
  drafts.a = a.rga.toArray().join('');
  drafts.b = b.rga.toArray().join('');
  refresh();
}

const ready = ref(false);
function start(): void {
  if (ready.value)
    return;
  init();
  ready.value = true;
}

const converged = computed(() =>
  snapshot.a.text === snapshot.b.text && (snapshot.a.text.length > 0 || snapshot.a.ops > 0));

// --- static code samples ---------------------------------------------------
const setupCode = `import { Replica, Rga } from '@robonen/crdt';
import type { OpId } from '@robonen/crdt';

// Inserts and deletes travel as ops. Every op carries an \`id\`; that's all
// Replica's op log needs to dedup and compute deltas.
type CharOp =
  | { kind: 'insert'; id: OpId; value: string; originLeft: OpId | null }
  | { kind: 'delete'; id: OpId; target: OpId };

function makeSide(site: string) {
  const rga = new Rga<string>();
  const replica = new Replica<CharOp>(
    {
      // Return false when a causal dependency is missing — the Replica buffers
      // the op and retries it automatically once the dependency lands.
      integrate: (op) =>
        op.kind === 'insert'
          ? rga.integrateInsert(op.id, op.value, op.originLeft)
          : rga.integrateDelete(op.target),
    },
    site,
  );
  return { rga, replica };
}

const a = makeSide('A');
const b = makeSide('B');`;

const localEditCode = `// A types "cat" at the start. Each character is an insert anchored to the
// previous one via originLeft; nextId() advances A's Lamport clock.
let left: OpId | null = null;
for (const ch of 'cat') {
  const op = { kind: 'insert', id: a.replica.nextId(), value: ch, originLeft: left } as const;
  a.replica.commitLocal(op); // integrate locally + append to the log
  left = op.id;
}

// Concurrently, B types "dog" — it has NOT seen A's ops yet.
left = null;
for (const ch of 'dog') {
  const op = { kind: 'insert', id: b.replica.nextId(), value: ch, originLeft: left } as const;
  b.replica.commitLocal(op);
  left = op.id;
}

a.rga.toArray().join(''); // 'cat'
b.rga.toArray().join(''); // 'dog'  — the replicas have DIVERGED`;

const syncCode = `// Send each side only what it's missing, computed from the peer's version.
// Snapshot versions first so both deltas describe the pre-sync state.
const va = a.replica.version.clone();
const vb = b.replica.version.clone();

b.replica.receive(a.replica.delta(vb)); // B integrates A's 3 inserts
a.replica.receive(b.replica.delta(va)); // A integrates B's 3 inserts

// Both RGAs now hold the same six characters in the same order. The order is
// decided by compareOpId (higher clock wins; site id breaks the tie) — NOT by
// who synced first — so the result is identical on every replica.
a.rga.toArray().join(''); // e.g. 'dogcat'
a.rga.toArray().join('') === b.rga.toArray().join(''); // true — CONVERGED`;
</script>

<template>
  <div class="docs-section">
    <!-- Intro -->
    <div class="prose-docs">
      <h1>Playground</h1>
      <p>
        Reading about convergence only gets you so far — the intuition lands when you
        <em>watch two replicas disagree and then reconcile</em>. Below is a live, two-replica
        editor backed by the real <NuxtLink to="/crdt/rga">Rga</NuxtLink> and
        <NuxtLink to="/crdt/replica">Replica</NuxtLink> classes from this package. Edit each side
        independently, then press <strong>Sync</strong> and see them land on the exact same string.
      </p>
    </div>

    <!-- Live demo -->
    <div class="prose-docs">
      <h2>Live: two replicas, one string</h2>
      <p>
        Replica <strong>A</strong> and replica <strong>B</strong> each own a private copy of a
        shared document. Type something different into each, click <strong>Apply</strong> to commit
        those edits locally (they diverge), then <strong>Sync</strong> to exchange deltas and
        converge. The readout under each side shows its current value, how many local ops its log
        has produced, and its Lamport clock.
      </p>
    </div>

    <ClientOnly>
      <template #fallback>
        <div class="rounded-xl border border-(--border) bg-(--bg-subtle) p-8 text-center text-sm text-(--fg-subtle)">
          Loading interactive demo…
        </div>
      </template>

      <div class="rounded-xl border border-(--border) bg-(--bg-subtle) p-4 sm:p-5">
        <div v-if="!ready" class="flex flex-col items-center gap-3 py-8 text-center">
          <p class="text-sm text-(--fg-muted)">Spin up two fresh replicas to start editing.</p>
          <button
            type="button"
            class="rounded-md bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-fg) hover:bg-(--accent-hover) focus:outline-none focus:ring-2 focus:ring-(--ring)"
            @click="start()"
          >
            Start demo
          </button>
        </div>

        <div v-else class="flex flex-col gap-4">
          <!-- Two replica panes -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- Replica A -->
            <div class="flex flex-col gap-2 rounded-lg border border-(--border) bg-(--bg-elevated) p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-(--fg-muted)">Replica A</span>
                <span class="rounded bg-(--bg-inset) px-1.5 py-0.5 font-mono text-[11px] text-(--fg-subtle)">site: A</span>
              </div>
              <textarea
                v-model="drafts.a"
                rows="3"
                spellcheck="false"
                class="resize-none rounded-md border border-(--border) bg-(--bg) px-3 py-2 font-mono text-sm text-(--fg) focus:border-(--border-strong) focus:outline-none focus:ring-2 focus:ring-(--ring)"
                placeholder="Type on A…"
              />
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-md border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-xs font-medium text-(--fg) hover:bg-(--bg-inset) focus:outline-none focus:ring-2 focus:ring-(--ring)"
                  @click="apply('a')"
                >
                  Apply edits
                </button>
                <div class="ml-auto flex items-center gap-3 font-mono text-[11px] text-(--fg-subtle)">
                  <span>ops {{ snapshot.a.ops }}</span>
                  <span>clock {{ snapshot.a.clock }}</span>
                </div>
              </div>
              <div class="rounded-md bg-(--bg-inset) px-3 py-2 font-mono text-sm text-(--fg) break-all min-h-9">
                <span v-if="snapshot.a.text">{{ snapshot.a.text }}</span>
                <span v-else class="text-(--fg-subtle)">(empty)</span>
              </div>
            </div>

            <!-- Replica B -->
            <div class="flex flex-col gap-2 rounded-lg border border-(--border) bg-(--bg-elevated) p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-(--fg-muted)">Replica B</span>
                <span class="rounded bg-(--bg-inset) px-1.5 py-0.5 font-mono text-[11px] text-(--fg-subtle)">site: B</span>
              </div>
              <textarea
                v-model="drafts.b"
                rows="3"
                spellcheck="false"
                class="resize-none rounded-md border border-(--border) bg-(--bg) px-3 py-2 font-mono text-sm text-(--fg) focus:border-(--border-strong) focus:outline-none focus:ring-2 focus:ring-(--ring)"
                placeholder="Type on B…"
              />
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-md border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-xs font-medium text-(--fg) hover:bg-(--bg-inset) focus:outline-none focus:ring-2 focus:ring-(--ring)"
                  @click="apply('b')"
                >
                  Apply edits
                </button>
                <div class="ml-auto flex items-center gap-3 font-mono text-[11px] text-(--fg-subtle)">
                  <span>ops {{ snapshot.b.ops }}</span>
                  <span>clock {{ snapshot.b.clock }}</span>
                </div>
              </div>
              <div class="rounded-md bg-(--bg-inset) px-3 py-2 font-mono text-sm text-(--fg) break-all min-h-9">
                <span v-if="snapshot.b.text">{{ snapshot.b.text }}</span>
                <span v-else class="text-(--fg-subtle)">(empty)</span>
              </div>
            </div>
          </div>

          <!-- Sync bar -->
          <div class="flex flex-wrap items-center gap-3 border-t border-(--border) pt-3">
            <button
              type="button"
              class="rounded-md bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-fg) hover:bg-(--accent-hover) focus:outline-none focus:ring-2 focus:ring-(--ring)"
              @click="sync()"
            >
              Sync ↔
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-2 text-sm text-(--fg-muted) hover:bg-(--bg-inset) hover:text-(--fg) focus:outline-none focus:ring-2 focus:ring-(--ring)"
              @click="init()"
            >
              Reset
            </button>
            <span
              v-if="converged"
              class="ml-auto inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              ● Converged — both sides equal
            </span>
            <span
              v-else
              class="ml-auto inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
            >
              ● Diverged — sync to reconcile
            </span>
          </div>
        </div>
      </div>
    </ClientOnly>

    <div class="prose-docs">
      <p>
        Try the canonical experiment: type <code>cat</code> on A and <code>dog</code> on B, apply
        both, then sync. The result is the same six characters on both sides, every time — the order
        is decided by op id, not by who synced first. Reset and try it again to confirm it's
        deterministic.
      </p>
    </div>

    <!-- How it works -->
    <div class="prose-docs">
      <h2>How the demo is wired</h2>
      <p>
        There's no mock here. Each side is a real <code>Rga&lt;string&gt;</code> wrapped in a
        <code>Replica&lt;CharOp&gt;</code>. The <code>Replica</code> owns the Lamport clock, the
        append-only op log, the causal buffer, and delta computation; the <code>Rga</code> holds the
        actual character sequence with tombstones. We pass one handler — <code>integrate</code> —
        that applies an op to the RGA.
      </p>
    </div>
    <DocsCode :code="setupCode" lang="ts" />

    <div class="prose-docs">
      <h3>Making concurrent edits</h3>
      <p>
        A local edit is just an op: call <code>replica.nextId()</code> to mint a fresh op id (which
        ticks that site's Lamport clock), build the insert or delete, and pass it to
        <code>commitLocal</code>. That integrates the op into the RGA and appends it to the log in
        one step. Because A and B edit before any sync, they produce ops with overlapping clock
        values but different site ids — genuinely concurrent operations.
      </p>
    </div>
    <DocsCode :code="localEditCode" lang="ts" />

    <div class="prose-docs">
      <h3>Syncing the deltas</h3>
      <p>
        Sync is a delta exchange driven by version vectors. Each replica's
        <code>version</code> records the highest clock it has seen per site;
        <code>delta(remoteVersion)</code> returns exactly the ops the remote is missing.
        <code>receive</code> then dedups, integrates, and — crucially — <em>buffers</em> any op
        whose causal dependency hasn't arrived yet, retrying it automatically once that dependency
        lands.
      </p>
    </div>
    <DocsCode :code="syncCode" lang="ts" />

    <!-- Why it converges -->
    <div class="prose-docs">
      <h2>Why it always converges</h2>
      <p>
        The demo never special-cases conflicts, because the data structure can't have any. Three
        properties, each verified by the package's property tests, guarantee that every replica
        reaches the same state regardless of message order, duplication, or delay.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Commutative</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          A-then-B and B-then-A produce the same sequence. Concurrent inserts at the same origin are
          ordered by <code class="text-(--accent-text)">compareOpId</code>, so order of arrival
          doesn't matter.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Idempotent</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          Receiving the same op twice is a no-op. The op log's version vector dedups on
          <code class="text-(--accent-text)">id</code>, and <code class="text-(--accent-text)">integrateInsert</code>
          short-circuits if the id is already present.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Causal</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          An insert can't integrate before its <code class="text-(--accent-text)">originLeft</code>,
          nor a delete before its target. <code class="text-(--accent-text)">receive</code> buffers
          such ops and retries them, so out-of-order delivery still converges.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h3>The single source of truth: op id order</h3>
      <p>
        Everything hinges on one comparison. When two replicas insert characters at the same
        position concurrently, <code>Rga.integrateInsert</code> walks past any existing siblings
        whose op id sorts <em>higher</em> and splices the new node in — so the final order is fully
        determined by <code>compareOpId</code>: higher Lamport clock first, with the site id as a
        deterministic tie-break. Every replica runs the same comparison on the same ids, so they all
        agree on the same order without a coordinator.
      </p>
      <p>
        That's also why deletes are tombstones rather than removals: a delete only flips a node's
        <code>deleted</code> flag, so a concurrent insert that anchored to that node still has a
        valid origin. The character disappears from <code>toArray()</code>, but the structure stays
        intact for convergence. Tombstones are reclaimed later via
        <NuxtLink to="/crdt/rga"><code>Rga.gc</code></NuxtLink>, but only at quiescence.
      </p>
    </div>

    <!-- Things to try -->
    <div class="prose-docs">
      <h2>Experiments to try</h2>
      <ul>
        <li>
          <strong>Repeat sync.</strong> Press <strong>Sync</strong> twice in a row — the second pass
          applies nothing, because each side's delta is now empty. Idempotence in action.
        </li>
        <li>
          <strong>Concurrent deletes.</strong> Sync to a shared value, then delete different
          characters on each side and sync again. Both deletions survive; neither clobbers the other.
        </li>
        <li>
          <strong>Edit after sync.</strong> Keep editing on one side and syncing repeatedly — only
          the new ops travel each time, because <code>delta</code> filters by the peer's version
          vector.
        </li>
        <li>
          <strong>Tie-break.</strong> Type a single different character at the very start of each
          side, then sync. The one whose op id sorts higher lands first — deterministically.
        </li>
      </ul>
    </div>

    <!-- Where next -->
    <div class="prose-docs">
      <h2>Where to next</h2>
      <ul>
        <li>
          <NuxtLink to="/crdt/rga">Rga</NuxtLink> — the full sequence API: tombstones, cursor
          anchoring via op ids, and garbage collection.
        </li>
        <li>
          <NuxtLink to="/crdt/replica">Replica</NuxtLink> — clock, op log, causal buffer, deltas,
          and the <code>onUpdate</code> subscription used to drive UI.
        </li>
        <li>
          <NuxtLink to="/crdt/version-vector">VersionVector</NuxtLink> and
          <NuxtLink to="/crdt/compare-op-id">compareOpId</NuxtLink> — the causality and tie-break
          machinery behind every primitive.
        </li>
      </ul>
    </div>
  </div>
</template>
