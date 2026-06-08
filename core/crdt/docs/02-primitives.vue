<!-- title: Primitives -->
<!-- order: 2 -->
<script setup lang="ts">
const lwwRegister = `import { LwwRegister, opId } from '@robonen/crdt';

// Two replicas hold the same register, start from the same value.
const a = new LwwRegister('draft');
const b = new LwwRegister('draft');

// They write concurrently — A at clock 4, B at clock 5.
a.set('A wins?', opId('a', 4));
b.set('B wins!', opId('b', 5));

// Exchange the writes (order and duplicates don't matter):
a.set('B wins!', opId('b', 5)); // 5 > 4 → accepted, returns true
b.set('A wins?', opId('a', 4)); // 4 < 5 → rejected, returns false

a.get(); // 'B wins!'
a.get() === b.get(); // true — converged on the higher op id`;

const lwwMap = `import { LwwMap, opId } from '@robonen/crdt';

const a = new LwwMap<string, string>();
const b = new LwwMap<string, string>();

// Concurrent edits to the same key, plus a concurrent delete.
a.set('color', 'red', opId('a', 7));
b.set('color', 'blue', opId('b', 7)); // same clock — site id breaks the tie

a.delete('color', opId('a', 7));        // tie too: delete vs set at the same id

// After both replicas see all three ops…
b.set('color', 'red', opId('a', 7));    // already covered by b's clock-7 write
a.set('color', 'blue', opId('b', 7));   // 'b' > 'a' at clock 7 → blue wins

a.get('color'); // 'blue'
a.has('color'); // true
a.toEntries();  // [['color', 'blue']]`;

const fractionalBetween = `import { keyBetween } from '@robonen/crdt';

// Open bounds (null) ask for "before everything" / "after everything".
const first = keyBetween(null, null);  // e.g. 'V'
const second = keyBetween(first, null); // a key after 'first'
const zeroth = keyBetween(null, first); // a key before 'first'

// Insert strictly between two existing neighbors — no renumbering, ever.
const mid = keyBetween(zeroth, first);
zeroth < mid && mid < first; // true

// Sorting items by key reproduces their order:
const items = [
  { text: 'b', key: first },
  { text: 'a', key: zeroth },
  { text: 'ab', key: mid },
];
items.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
items.map(i => i.text); // ['a', 'ab', 'b']`;

const fractionalBatch = `import { keysBetween } from '@robonen/crdt';

// Pre-allocate N keys at once — ascending, all strictly between the bounds.
const keys = keysBetween(null, null, 5);
// each keys[i] < keys[i + 1]

// Moving an item is a single-field write: give it a new key between its
// new neighbors and re-sort. Nothing else in the list changes.
function move(list, fromKeyLeft, fromKeyRight) {
  return keyBetween(fromKeyLeft, fromKeyRight);
}`;

const rgaBasic = `import { Rga, opId } from '@robonen/crdt';

const rga = new Rga<string>();

// integrateInsert(id, value, originLeft) — originLeft = null means "at the start".
rga.integrateInsert(opId('a', 1), 'H', null);
rga.integrateInsert(opId('a', 2), 'i', opId('a', 1)); // after 'H'

rga.toArray().join(''); // 'Hi'

// Delete = tombstone. The node stays as an anchor; it just stops being visible.
rga.integrateDelete(opId('a', 2));
rga.toArray().join(''); // 'H'
rga.length;             // 1  (visible count, tombstones excluded)`;

const rgaConverge = `import { Rga, opId } from '@robonen/crdt';

// Two replicas both start from "AC" and concurrently insert after 'A'.
function seed() {
  const rga = new Rga<string>();
  rga.integrateInsert(opId('seed', 1), 'A', null);
  rga.integrateInsert(opId('seed', 2), 'C', opId('seed', 1));
  return rga;
}

const left = seed();
const right = seed();

// left inserts 'x' after 'A'; right inserts 'y' after 'A' — same origin.
const xOp = { id: opId('left', 5), value: 'x', origin: opId('seed', 1) };
const yOp = { id: opId('right', 5), value: 'y', origin: opId('seed', 1) };

// Apply locally, then exchange. Order and duplicates don't matter.
left.integrateInsert(xOp.id, xOp.value, xOp.origin);
left.integrateInsert(yOp.id, yOp.value, yOp.origin);

right.integrateInsert(yOp.id, yOp.value, yOp.origin);
right.integrateInsert(xOp.id, xOp.value, xOp.origin);

// Tie-break: higher op id first. opId('right', 5) > opId('left', 5)
// (same clock, 'right' > 'left'), so 'y' lands before 'x'.
left.toArray().join('');  // 'AyxC'
right.toArray().join(''); // 'AyxC' — converged`;

const rgaBuffer = `import { Rga, opId } from '@robonen/crdt';

const rga = new Rga<string>();
rga.integrateInsert(opId('a', 1), 'H', null);

// An op arrives BEFORE its origin (causal violation). integrateInsert
// returns false instead of corrupting order — the caller buffers it.
const pending = { id: opId('a', 3), value: '!', origin: opId('a', 2) };
const ok = rga.integrateInsert(pending.id, pending.value, pending.origin);
// ok === false — origin opId('a', 2) isn't present yet

// Once the missing origin lands, retry the buffered op:
rga.integrateInsert(opId('a', 2), 'i', opId('a', 1));
rga.integrateInsert(pending.id, pending.value, pending.origin); // now true

rga.toArray().join(''); // 'Hi!'`;

const marks = `import { Rga, MarkStore, opId } from '@robonen/crdt';

// Build a sequence and grab the op ids of its characters.
const rga = new Rga<string>();
const ids: ReturnType<typeof opId>[] = [];
let left: ReturnType<typeof opId> | null = null;
for (let i = 0; i < 'bold'.length; i++) {
  const id = opId('a', i + 1);
  rga.integrateInsert(id, 'bold'[i]!, left);
  ids.push(id);
  left = id;
}

const marks = new MarkStore();

// A span anchors to the FIRST and LAST character op ids (inclusive), not to
// integer offsets — so it survives concurrent inserts/deletes around it.
marks.add({
  id: opId('a', 10),
  type: 'strong',
  value: true,
  start: ids[0]!, // 'b'
  end: ids[3]!,   // 'd'
});

// resolve() returns one active type→value map per character, in document order.
const active = marks.resolve(rga.visible().map(n => n.id));
active.map(m => m.get('strong')); // [true, true, true, true]`;

const marksConflict = `import { MarkStore, opId } from '@robonen/crdt';

const store = new MarkStore();
const start = opId('a', 1);
const end = opId('a', 4);

// Concurrent formatting on the same range: B turns it bold, A clears it.
store.add({ id: opId('a', 9), type: 'strong', value: false, start, end });
store.add({ id: opId('b', 9), type: 'strong', value: true, start, end });

// Highest op id wins per (character, type). opId('b', 9) > opId('a', 9),
// so 'strong' resolves to true — a null/false value would have cleared it.
const order = [opId('a', 1), opId('a', 2), opId('a', 3), opId('a', 4)];
store.resolve(order).map(m => m.get('strong')); // [true, true, true, true]`;
</script>

<template>
  <div class="docs-section">
    <!-- Intro -->
    <div class="prose-docs">
      <h1>Primitives</h1>
      <p>
        <code>@robonen/crdt</code> is a small set of independent data structures, each convergent on
        its own. You can use a single primitive in isolation — a last-writer-wins setting, an ordered
        list, a collaborative string — or compose them into something bigger. This page walks through
        each one with a construction example and a small converging scenario.
      </p>
      <p>
        Every primitive leans on one shared idea:
        <NuxtLink to="/crdt/compare-op-id">compareOpId</NuxtLink> — a deterministic total order over
        operation ids (higher Lamport clock wins; site id breaks ties). Because all primitives resolve
        conflicts the same way, two replicas that have seen the same operations always agree, no matter
        the order or duplicates in which those operations arrived. If op ids are new to you, start with
        <NuxtLink to="/crdt/concepts">Concepts</NuxtLink>.
      </p>
    </div>

    <!-- Map of the package -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Registers</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          <code class="text-(--accent-text)">LwwRegister</code> and
          <code class="text-(--accent-text)">LwwMap</code> — single values and keyed maps where the
          write with the highest op id wins.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Ordering</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          <code class="text-(--accent-text)">keyBetween</code> /
          <code class="text-(--accent-text)">keysBetween</code> — fractional indexing to place or move
          an item with a single string key.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Sequence</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          <code class="text-(--accent-text)">Rga</code> — a replicated growable array: an ordered
          sequence CRDT with tombstones and a deterministic insert tie-break.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-(--fg)">Marks</h3>
        <p class="text-sm leading-relaxed text-(--fg-muted)">
          <code class="text-(--accent-text)">MarkStore</code> — lightweight Peritext formatting spans
          anchored to character op ids, resolved per character by highest op id.
        </p>
      </div>
    </div>

    <!-- Registers -->
    <div class="prose-docs">
      <h2>LWW registers</h2>
      <p>
        A <NuxtLink to="/crdt/lww-register">LwwRegister</NuxtLink> is the smallest CRDT: a single
        value with a timestamp. Every write carries an <code>OpId</code>, and a write only takes effect
        if its id is strictly later than the current one by <code>compareOpId</code>. That single rule
        gives you the three convergence properties for free — applying writes is
        <strong>commutative</strong> (a later write always beats an earlier one regardless of arrival
        order), <strong>idempotent</strong> (re-applying a write is a no-op), and
        <strong>convergent</strong> (every replica ends on the same winning write).
      </p>
      <p>
        <code>set(value, id)</code> returns <code>true</code> when the write won and
        <code>false</code> when it was superseded, which is handy for skipping downstream work.
      </p>
    </div>
    <DocsCode :code="lwwRegister" lang="ts" />

    <div class="prose-docs">
      <h3>LwwMap</h3>
      <p>
        <NuxtLink to="/crdt/lww-map">LwwMap</NuxtLink> is a register per key. Each entry tracks its own
        timestamp and a tombstone flag, so concurrent <code>set</code> and <code>delete</code> on the
        same key converge to whichever has the higher op id — deleting is just another timestamped
        write that happens to hide the value. <code>get</code>, <code>has</code>, <code>keys</code>,
        and <code>toEntries</code> all skip tombstoned entries, so the map reads like a plain map even
        though deletions are retained internally for convergence.
      </p>
    </div>
    <DocsCode :code="lwwMap" lang="ts" />

    <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-4">
      <p class="text-sm leading-relaxed text-(--fg-muted)">
        <strong class="text-(--fg)">Why keep tombstones?</strong> If a delete simply dropped the entry,
        a concurrent <code class="text-(--accent-text)">set</code> arriving afterward would resurrect
        the key — the two replicas would disagree on whether it exists. Retaining the delete as a
        timestamped tombstone lets <code class="text-(--accent-text)">compareOpId</code> decide the
        winner deterministically, the same way it does for live values.
      </p>
    </div>

    <!-- Ordering -->
    <div class="prose-docs">
      <h2>Fractional indexing</h2>
      <p>
        Ordering a collaborative list with integer indices is a trap: insert at position 2 and every
        index after it shifts, so two replicas inserting concurrently clobber each other's positions.
        <NuxtLink to="/crdt/key-between">keyBetween</NuxtLink> sidesteps this by giving each item a
        <em>string key</em> that lives strictly between its neighbors. Order is recovered by sorting
        keys with plain string comparison — the digit alphabet is ASCII-ascending, so lexical order
        matches digit order.
      </p>
      <p>
        Pass <code>null</code> for an open bound: <code>keyBetween(null, x)</code> is "before
        <code>x</code>", <code>keyBetween(x, null)</code> is "after <code>x</code>", and
        <code>keyBetween(null, null)</code> seeds an empty list. The result is always strictly between
        the bounds, so there is unlimited room to keep subdividing — you never run out of space to
        insert between two adjacent items.
      </p>
    </div>
    <DocsCode :code="fractionalBetween" lang="ts" />

    <div class="prose-docs">
      <h3>Batches and moves</h3>
      <p>
        <NuxtLink to="/crdt/keys-between">keysBetween</NuxtLink> generates <code>n</code> keys at once,
        all strictly between the bounds and in ascending order — useful for seeding a list or
        bulk-inserting a run of items. Because a key is just a value on the item, <strong>moving</strong>
        an item is a single-field write: compute a new key between its new neighbors and re-sort.
        Nothing else in the list is touched, which is exactly what makes concurrent reorders converge
        cleanly (they reduce to independent
        <NuxtLink to="/crdt/lww-register">LwwRegister</NuxtLink> writes on each item's key).
      </p>
    </div>
    <DocsCode :code="fractionalBatch" lang="ts" />

    <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <p class="text-sm leading-relaxed text-(--fg-muted)">
        <strong class="text-amber-700 dark:text-amber-400">Heads up:</strong>
        <code class="text-(--accent-text)">keyBetween</code> requires <code>lower &lt; upper</code>
        and throws otherwise. Two replicas independently generating a key between the
        <em>same</em> neighbors can produce identical keys; pair the key with the item's op id as a
        secondary sort to keep ordering deterministic, or let
        <NuxtLink to="/crdt/rga">Rga</NuxtLink> handle character-level ordering for you.
      </p>
    </div>

    <!-- Sequence -->
    <div class="prose-docs">
      <h2>The RGA sequence</h2>
      <p>
        <NuxtLink to="/crdt/rga">Rga</NuxtLink> (Replicated Growable Array) is the heart of the
        package — the CRDT behind collaborative text. Each element is a node with a unique
        <code>OpId</code>, a value, and an <code>originLeft</code>: the id of the element it was
        inserted <em>after</em> (<code>null</code> means the start of the sequence). Deletion never
        removes a node; it sets a <strong>tombstone</strong> flag, so the node lives on as a stable
        anchor that later inserts and marks can still reference.
      </p>
      <p>
        <code>integrateInsert(id, value, originLeft)</code> and <code>integrateDelete(id)</code> are
        both idempotent — re-integrating an op you've already seen is a no-op that safely returns
        <code>true</code>. Read the visible state with <code>toArray()</code>; use
        <code>visible()</code> to get the surviving nodes (and their ids) for cursor anchoring, and
        <code>length</code> for the visible count.
      </p>
    </div>
    <DocsCode :code="rgaBasic" lang="ts" />

    <div class="prose-docs">
      <h3>Concurrent inserts and the tie-break</h3>
      <p>
        The interesting case is two replicas inserting at the <em>same</em> origin at the same time.
        Both new elements claim the slot right after the same left neighbor — so which goes first? RGA
        resolves this deterministically: among elements sharing an origin, the one with the
        <strong>higher op id</strong> is placed first (<code>compareOpId &gt; 0</code> scans past it).
        Because every replica applies the identical comparison, they all settle on the same order
        without any coordination.
      </p>
    </div>
    <DocsCode :code="rgaConverge" lang="ts" />

    <div class="prose-docs">
      <h3>Causal buffering</h3>
      <p>
        RGA requires inserts to be integrated <strong>in causal order</strong>: an element's
        <code>originLeft</code> must already be present, or there's no anchor to insert after. Rather
        than guess, <code>integrateInsert</code> returns <code>false</code> when the origin is missing
        and <code>integrateDelete</code> returns <code>false</code> for an unknown target — the signal
        to <em>buffer</em> the op and retry once its dependency lands. (At a higher level,
        <NuxtLink to="/crdt/replica">Replica</NuxtLink> does this bookkeeping for you, holding and
        replaying ops automatically.)
      </p>
    </div>
    <DocsCode :code="rgaBuffer" lang="ts" />

    <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-4">
      <p class="text-sm leading-relaxed text-(--fg-muted)">
        <strong class="text-(--fg)">Garbage collection.</strong> Tombstones accumulate. When every
        replica has fully synced and nothing is in flight, <code class="text-(--accent-text)">gc(stable, keep?)</code>
        drops deleted nodes whose insert is covered by a stable
        <NuxtLink to="/crdt/version-vector">VersionVector</NuxtLink>, returning how many it removed.
        Run it only at quiescence — a late op that uses a dropped node as its origin could no longer
        integrate — and pass <code class="text-(--accent-text)">keep</code> to protect ids still
        referenced elsewhere, such as mark span endpoints.
      </p>
    </div>

    <!-- Marks -->
    <div class="prose-docs">
      <h2>Marks (lightweight Peritext)</h2>
      <p>
        Formatting in a collaborative editor can't be stored by offset — insert a character and every
        offset after it shifts, so a "bold from 3 to 7" range would drift onto the wrong text.
        <NuxtLink to="/crdt/mark-store">MarkStore</NuxtLink> follows the
        <a href="https://www.inkandswitch.com/peritext/" target="_blank" rel="noopener">Peritext</a>
        model: a <code>MarkSpan</code> anchors to the <code>OpId</code> of its first and last
        characters (an inclusive range), so the span moves with the text it covers as the sequence
        grows and shrinks around it.
      </p>
      <p>
        A span's <code>value</code> is a JSON-serializable <code>MarkValue</code> — pass
        <code>true</code> (or attributes like a color string) to apply the mark, and
        <code>null</code> or <code>false</code> to clear it.
      </p>
    </div>
    <DocsCode :code="marks" lang="ts" />

    <div class="prose-docs">
      <h3>Resolving and converging</h3>
      <p>
        <code>add(span)</code> just records a span (idempotent by span id). The real work is
        <code>resolve(order)</code>: given the character op ids in document order — typically
        <code>rga.visible().map(n =&gt; n.id)</code> — it returns one <code>Map&lt;type, value&gt;</code>
        of active marks per character. For each character and mark type, the covering span with the
        <strong>highest op id wins</strong>, so concurrent formatting converges by the same
        <code>compareOpId</code> rule as everything else; a winning <code>null</code>/<code>false</code>
        span clears the mark.
      </p>
    </div>
    <DocsCode :code="marksConflict" lang="ts" />

    <!-- Where next -->
    <div class="prose-docs">
      <h2>Where to next</h2>
      <ul>
        <li>
          <NuxtLink to="/crdt/concepts">Concepts</NuxtLink> — op ids, Lamport clocks, version vectors,
          and why convergence holds across all of these primitives.
        </li>
        <li>
          <NuxtLink to="/crdt/replication">Replication &amp; Sync</NuxtLink> — wire the primitives to a
          <NuxtLink to="/crdt/replica">Replica</NuxtLink> for delta sync and automatic causal
          buffering.
        </li>
        <li>
          <NuxtLink to="/crdt/playground">Playground</NuxtLink> — watch two replicas diverge and
          reconcile, live in the browser.
        </li>
      </ul>
    </div>
  </div>
</template>
