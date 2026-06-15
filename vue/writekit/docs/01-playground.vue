<!-- title: Playground -->
<!-- order: 1 -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { WritekitDocument, Inline, InlineNode, Node, RemoteCursor } from '../src';
import {
  bindCrdt,
  createDefaultRegistry,
  createDoc,
  createWritekit,
  createWritekitState,
  createNativeProvider,
  createNode,
  WritekitBubbleMenu,
  WritekitContent,
  WritekitRemoteCursors,
  WritekitRoot,
  WritekitSlashMenu,
  isBlockActive,
  isMarkActive,
  setBlockType,
  toggleBlockType,
  toggleMark,
} from '../src';

// ── Content helpers ──────────────────────────────────────────────────────────
function t(text: string, ...markTypes: string[]): InlineNode {
  return { text, marks: markTypes.map(type => ({ type })) };
}
function p(content: string | Inline = ''): Node {
  const inline = typeof content === 'string' ? (content ? [t(content)] : []) : content;
  return createNode('paragraph', { content: inline });
}
const heading = (level: number, text: string): Node => createNode('heading', { attrs: { level }, content: text ? [t(text)] : [] });
const quote = (text: string): Node => createNode('blockquote', { content: [t(text)] });
const codeBlock = (text: string): Node => createNode('code-block', { content: [t(text)] });
const callout = (variant: string, text: string): Node => createNode('callout', { attrs: { variant }, content: [t(text)] });
const bullet = (text: string): Node => createNode('bulleted-list', { attrs: { indent: 0 }, content: [t(text)] });
const numbered = (text: string): Node => createNode('numbered-list', { attrs: { indent: 0 }, content: [t(text)] });
const todo = (text: string, checked = false): Node => createNode('todo-list', { attrs: { checked, indent: 0 }, content: [t(text)] });
const divider = (): Node => createNode('divider');

/** Visible text of a document (for word count / convergence check). */
function docText(doc: WritekitDocument): string {
  return doc.content
    .map((block) => {
      const c = block.content as unknown;
      return Array.isArray(c) ? c.map(run => (run && typeof run === 'object' && 'text' in run ? String((run as InlineNode).text) : '')).join('') : '';
    })
    .join('\n');
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'writekit', label: 'Rich text & blocks' },
  { id: 'collab', label: 'Multiplayer' },
] as const;
const tab = ref<'writekit' | 'collab'>('writekit');

const registry = createDefaultRegistry();

// ── Tab 1: the rich writekit (drag-to-reorder + live output) ───────────────────
const writekit = createWritekit({
  state: createWritekitState({
    registry,
    doc: createDoc([
      heading(1, 'Try the writekit'),
      p([
        t('A headless, block-based rich-text writekit for Vue. This line mixes '),
        t('bold', 'bold'), t(', '), t('italic', 'italic'), t(', '), t('code', 'code'),
        t(' and '), t('highlight', 'highlight'), t('.'),
      ]),
      p('Hover a block and drag the ⠿ handle on its left to reorder. Select text for the bubble menu, or type “/” on an empty line for the block menu.'),
      heading(2, 'Blocks'),
      bullet('Bulleted lists'),
      numbered('Numbered lists'),
      todo('A checkable to-do item', false),
      quote('Block quotes for asides and citations.'),
      callout('info', 'Callouts highlight tips and notes.'),
      codeBlock('const writekit = createWritekit(createWritekitState({ registry, doc }))'),
      divider(),
      p(''),
    ]),
  }),
});

const rev = ref(0);
const bump = (): void => void (rev.value += 1);
writekit.on('transaction', bump);
onBeforeUnmount(() => writekit.off('transaction', bump));

const boldActive = computed(() => (rev.value, isMarkActive(writekit.state, 'bold')));
const italicActive = computed(() => (rev.value, isMarkActive(writekit.state, 'italic')));
const codeActive = computed(() => (rev.value, isMarkActive(writekit.state, 'code')));
const highlightActive = computed(() => (rev.value, isMarkActive(writekit.state, 'highlight')));
const h1Active = computed(() => (rev.value, isBlockActive(writekit.state, 'heading', { level: 1 })));
const h2Active = computed(() => (rev.value, isBlockActive(writekit.state, 'heading', { level: 2 })));
const quoteActive = computed(() => (rev.value, isBlockActive(writekit.state, 'blockquote')));
const canUndo = computed(() => (rev.value, writekit.canUndo()));
const canRedo = computed(() => (rev.value, writekit.canRedo()));

// Live output
const showJson = ref(false);
const blockCount = computed(() => (rev.value, writekit.state.doc.content.length));
const wordCount = computed(() => (rev.value, docText(writekit.state.doc).trim().split(/\s+/).filter(Boolean).length));
const sid = (id: string): string => id.slice(0, 4);
const selectionSummary = computed(() => {
  void rev.value;
  const s = writekit.state.selection;
  if (s.kind === 'text')
    return `text · ${sid(s.anchor.blockId)}:${s.anchor.offset} → ${sid(s.focus.blockId)}:${s.focus.offset}`;
  return `node · ${s.ids.length} block${s.ids.length === 1 ? '' : 's'}`;
});
const docJson = computed(() => (rev.value, JSON.stringify(writekit.state.doc, null, 2)));

// ── Tab 2: two CRDT replicas, synced in memory (multiplayer) ─────────────────
const seed = createDoc([
  heading(1, 'Shared document'),
  p('Edit in either pane — each is its own @robonen/crdt replica. Concurrent edits converge and you see the other cursor.'),
  p(''),
]);

const writekitA = createWritekit({ state: createWritekitState({ registry, doc: seed }) });
const providerA = createNativeProvider({ schema: registry.schema, doc: writekitA.state.doc, user: { name: 'Alice', color: '#2563eb' } });

const writekitB = createWritekit({ state: createWritekitState({ registry }) });
const providerB = createNativeProvider({ schema: registry.schema, user: { name: 'Bob', color: '#db2777' } });

const bindingA = bindCrdt(writekitA, providerA);
const bindingB = bindCrdt(writekitB, providerB);
providerB.applyUpdate(providerA.encodeDelta());

// In-memory transport with a "Connected" switch: while offline, ops queue and
// the docs diverge; reconnecting flushes them and they converge.
const connected = ref(true);
let queueAB: Uint8Array[] = [];
let queueBA: Uint8Array[] = [];

const offOpsA = providerA.onLocalOps((bytes) => {
  if (connected.value) providerB.applyUpdate(bytes);
  else queueAB.push(bytes);
});
const offOpsB = providerB.onLocalOps((bytes) => {
  if (connected.value) providerA.applyUpdate(bytes);
  else queueBA.push(bytes);
});

watch(connected, (on) => {
  if (!on) return;
  for (const b of queueAB) providerB.applyUpdate(b);
  for (const b of queueBA) providerA.applyUpdate(b);
  queueAB = [];
  queueBA = [];
});

const cursorsA = ref<RemoteCursor[]>([]);
const cursorsB = ref<RemoteCursor[]>([]);
const offCurA = providerA.onAwareness(c => (cursorsA.value = c));
const offCurB = providerB.onAwareness(c => (cursorsB.value = c));
const offAwA = providerA.onLocalAwareness(bytes => connected.value && providerB.applyAwareness(bytes));
const offAwB = providerB.onLocalAwareness(bytes => connected.value && providerA.applyAwareness(bytes));

const collabRev = ref(0);
const bumpCollab = (): void => void (collabRev.value += 1);
writekitA.on('transaction', bumpCollab);
writekitB.on('transaction', bumpCollab);

const inSync = computed(() => (collabRev.value, docText(writekitA.state.doc) === docText(writekitB.state.doc)));

onBeforeUnmount(() => {
  for (const off of [offOpsA, offOpsB, offCurA, offCurB, offAwA, offAwB]) off();
  writekitA.off('transaction', bumpCollab);
  writekitB.off('transaction', bumpCollab);
  bindingA.detach();
  bindingB.detach();
});
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>Playground</h1>
      <p>
        Live <code>@robonen/writekit</code> instances built with the default registry — the real
        headless controller, single-contenteditable view, and CRDT-backed model from the API
        reference. Switch tabs to explore the capabilities.
      </p>
    </div>

    <!-- Tabs -->
    <div class="ed-tabs" role="tablist">
      <button
        v-for="tb in tabs"
        :key="tb.id"
        type="button"
        role="tab"
        :aria-selected="tab === tb.id"
        :class="['ed-tab', { 'ed-tab-active': tab === tb.id }]"
        @click="tab = tb.id"
      >
        {{ tb.label }}
      </button>
    </div>

    <ClientOnly>
      <!-- ── Rich text & blocks ───────────────────────────────────────────── -->
      <div v-show="tab === 'writekit'" class="writekit-demo">
        <div class="writekit-demo-toolbar">
          <button type="button" title="Bold" :data-active="boldActive || undefined" @mousedown.prevent="writekit.command(toggleMark('bold'))"><b>B</b></button>
          <button type="button" title="Italic" :data-active="italicActive || undefined" @mousedown.prevent="writekit.command(toggleMark('italic'))"><i>I</i></button>
          <button type="button" title="Inline code" :data-active="codeActive || undefined" @mousedown.prevent="writekit.command(toggleMark('code'))"><code>&lt;&gt;</code></button>
          <button type="button" title="Highlight" :data-active="highlightActive || undefined" @mousedown.prevent="writekit.command(toggleMark('highlight'))">H</button>
          <span class="sep" />
          <button type="button" title="Heading 1" :data-active="h1Active || undefined" @mousedown.prevent="writekit.command(toggleBlockType('heading', { level: 1 }))">H1</button>
          <button type="button" title="Heading 2" :data-active="h2Active || undefined" @mousedown.prevent="writekit.command(toggleBlockType('heading', { level: 2 }))">H2</button>
          <button type="button" title="Quote" :data-active="quoteActive || undefined" @mousedown.prevent="writekit.command(toggleBlockType('blockquote'))">❝</button>
          <button type="button" title="Paragraph" @mousedown.prevent="writekit.command(setBlockType('paragraph'))">¶</button>
          <span class="sep" />
          <button type="button" title="Undo" :disabled="!canUndo" @mousedown.prevent="writekit.undo()">↺</button>
          <button type="button" title="Redo" :disabled="!canRedo" @mousedown.prevent="writekit.redo()">↻</button>
        </div>

        <WritekitRoot :writekit="writekit" draggable class="writekit-demo-root">
          <WritekitContent />
          <WritekitBubbleMenu />
          <WritekitSlashMenu />
        </WritekitRoot>

        <!-- Live output -->
        <div class="ed-output">
          <div class="ed-stats">
            <span><b>{{ blockCount }}</b> blocks</span>
            <span><b>{{ wordCount }}</b> words</span>
            <span class="ed-sel">selection: <code>{{ selectionSummary }}</code></span>
            <button type="button" class="ed-json-toggle" @click="showJson = !showJson">
              {{ showJson ? 'Hide' : 'Show' }} document JSON
            </button>
          </div>
          <pre v-if="showJson" class="ed-json">{{ docJson }}</pre>
        </div>
      </div>

      <!-- ── Multiplayer ──────────────────────────────────────────────────── -->
      <div v-show="tab === 'collab'" class="writekit-demo">
        <div class="ed-collab-bar">
          <span class="ed-peer"><span class="ed-dot" style="background:#2563eb" />Alice</span>
          <span class="ed-peer"><span class="ed-dot" style="background:#db2777" />Bob</span>
          <span class="ed-spacer" />
          <span :class="['ed-sync', inSync ? 'ed-sync-ok' : 'ed-sync-pending']">
            {{ inSync ? 'in sync' : 'diverged' }}
          </span>
          <button type="button" :class="['ed-conn', connected ? 'ed-conn-on' : 'ed-conn-off']" @click="connected = !connected">
            {{ connected ? 'Connected' : 'Offline' }}
          </button>
        </div>

        <div class="ed-collab-grid">
          <WritekitRoot :writekit="writekitA" draggable class="writekit-demo-root collab">
            <WritekitContent />
            <WritekitRemoteCursors :cursors="cursorsA" />
            <WritekitBubbleMenu />
            <WritekitSlashMenu />
          </WritekitRoot>
          <WritekitRoot :writekit="writekitB" draggable class="writekit-demo-root collab">
            <WritekitContent />
            <WritekitRemoteCursors :cursors="cursorsB" />
            <WritekitBubbleMenu />
            <WritekitSlashMenu />
          </WritekitRoot>
        </div>

        <p class="ed-hint">
          Each pane is a separate CRDT replica synced over an in-memory channel. Toggle
          <b>Offline</b>, edit both sides so they diverge, then reconnect — the replicas
          converge automatically (no Yjs).
        </p>
      </div>

      <template #fallback>
        <div class="flex min-h-72 items-center justify-center gap-2 rounded-xl border border-border bg-bg-subtle text-sm text-fg-subtle">
          <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading writekit…
        </div>
      </template>
    </ClientOnly>

    <div class="prose-docs">
      <h2>How it's wired</h2>
      <p>
        The writekit is created from a registry and a document, then rendered with a single
        <code>WritekitRoot</code>. Multiplayer is just two writekits, each bound to its own CRDT
        replica with <code>bindCrdt</code>, exchanging ops over any transport.
      </p>
    </div>
    <DocsCode
      lang="ts"
      :code="`import {
  WritekitRoot, WritekitContent, WritekitRemoteCursors,
  createDefaultRegistry, createDoc, createWritekit, createWritekitState,
  createNativeProvider, bindCrdt,
} from '@robonen/writekit';

const registry = createDefaultRegistry();
const writekit = createWritekit({ state: createWritekitState({ registry, doc: createDoc(blocks) }) });

// Collaboration: bind the writekit to a CRDT replica and pipe ops to peers.
const provider = createNativeProvider({ schema: registry.schema, user: { name: 'Alice' } });
bindCrdt(writekit, provider);
provider.onLocalOps(bytes => socket.send(bytes));   // any transport
socket.onmessage = bytes => provider.applyUpdate(bytes);`"
    />

    <div class="prose-docs">
      <p>
        See <NuxtLink to="/writekit/create-writekit">createWritekit</NuxtLink>,
        <NuxtLink to="/writekit/bind-crdt">bindCrdt</NuxtLink> and
        <NuxtLink to="/writekit/toggle-mark">toggleMark</NuxtLink> in the API reference for the full surface.
      </p>
    </div>
  </div>
</template>

<style>
/* Unscoped on purpose: the writekit renders its own DOM (and teleports menus to
   <body>), so scoped styles can't reach them. Selectors are namespaced under
   `.writekit-demo*`, `.ed-*` and the writekit's own classes to avoid leaking. */
.writekit-demo { counter-reset: writekit-demo-ol; }

/* tabs */
.ed-tabs { display: flex; gap: 4px; margin-bottom: 0.75rem; }
.ed-tab { padding: 6px 12px; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--fg-muted); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.12s, color 0.12s, border-color 0.12s; }
.ed-tab:hover { background: var(--bg-inset); color: var(--fg); }
.ed-tab-active { background: var(--accent); color: var(--accent-fg); border-color: transparent; }

/* toolbar */
.writekit-demo-toolbar { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; padding: 6px; border: 1px solid var(--border); border-bottom: 0; border-radius: 12px 12px 0 0; background: var(--bg-subtle); }
.writekit-demo-toolbar button { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 30px; padding: 0 9px; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--fg); border-radius: 7px; cursor: pointer; font-size: 13px; line-height: 1; transition: background 0.12s, border-color 0.12s; }
.writekit-demo-toolbar button code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }
.writekit-demo-toolbar button:hover { border-color: var(--border-strong); background: var(--bg-inset); }
.writekit-demo-toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
.writekit-demo-toolbar button[data-active] { background: var(--accent); color: var(--accent-fg); border-color: transparent; }
.writekit-demo-toolbar .sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }

/* editable surface */
.writekit-demo-root { border: 1px solid var(--border); border-radius: 0 0 12px 12px; padding: 1rem 1.25rem 1rem 2rem; min-height: 280px; background: var(--bg); color: var(--fg); }
.writekit-demo-root, .writekit-demo-root [data-writekit-content] { outline: none; }
.writekit-demo-root:focus-within { border-color: var(--accent); }

.writekit-demo-root [data-block-id] { position: relative; }
.writekit-demo-root [data-block-content] { outline: none; margin: 0.45em 0; line-height: 1.7; }
.writekit-demo-root h1[data-block-content], .writekit-demo-root h2[data-block-content], .writekit-demo-root h3[data-block-content] { margin: 0.7em 0 0.3em; line-height: 1.3; font-weight: 700; letter-spacing: -0.01em; }
.writekit-demo-root h1[data-block-content] { font-size: 1.6rem; }
.writekit-demo-root h2[data-block-content] { font-size: 1.3rem; }
.writekit-demo-root h3[data-block-content] { font-size: 1.1rem; }
.writekit-demo-root [data-block-content][data-empty]::before { content: attr(data-placeholder); color: var(--fg-subtle); pointer-events: none; }

/* inline marks */
.writekit-demo-root [data-block-content] strong { font-weight: 700; }
.writekit-demo-root [data-block-content] em { font-style: italic; }
.writekit-demo-root [data-block-content] u { text-decoration: underline; }
.writekit-demo-root [data-block-content] s, .writekit-demo-root [data-block-content] del { text-decoration: line-through; }
.writekit-demo-root [data-block-content] mark { background: rgba(245, 200, 66, 0.4); color: inherit; border-radius: 2px; padding: 0 0.1em; }
.writekit-demo-root [data-block-content] code { background: var(--bg-inset); border: 1px solid var(--border); padding: 0.05em 0.35em; border-radius: 4px; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.9em; }
.writekit-demo-root [data-block-content] a { color: var(--accent-text); text-decoration: underline; cursor: pointer; }

.writekit-demo-root blockquote[data-block-content] { border-left: 3px solid var(--border-strong); padding-left: 1rem; color: var(--fg-muted); font-style: italic; }
.writekit-demo-root pre[data-block-content] { background: var(--bg-inset); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.85rem; white-space: pre-wrap; }

/* callouts */
.writekit-demo-root [data-callout] { position: relative; border-radius: 8px; margin: 0.5em 0; padding: 0.6rem 0.8rem 0.6rem 2.4rem; border: 1px solid var(--border); background: var(--bg-subtle); }
.writekit-demo-root [data-callout]::before { position: absolute; left: 0.8rem; }
.writekit-demo-root [data-callout='info']::before { content: 'ℹ️'; }
.writekit-demo-root [data-callout='warn']::before { content: '⚠️'; }
.writekit-demo-root [data-callout='success']::before { content: '✅'; }

/* lists */
.writekit-demo-root [data-list] { position: relative; padding-left: 1.6em; }
.writekit-demo-root [data-list]::before { position: absolute; left: 0.35em; color: var(--fg-muted); }
.writekit-demo-root [data-list='bullet']::before { content: '•'; }
.writekit-demo-root [data-list='ordered'] { counter-increment: writekit-demo-ol; }
.writekit-demo-root [data-list='ordered']::before { content: counter(writekit-demo-ol) '.'; }
.writekit-demo-root [data-list='todo']::before { content: '☐'; }
.writekit-demo-root [data-list='todo'][data-checked='true']::before { content: '☑'; }
.writekit-demo-root [data-list='todo'][data-checked='true'] { color: var(--fg-subtle); text-decoration: line-through; }

.writekit-demo-root [data-writekit-divider] { border: 0; border-top: 2px solid var(--border); margin: 1em 0; }

/* selection */
.writekit-demo-root ::selection { background: var(--accent-subtle); }
.writekit-demo-root [data-block-content][data-selected], .writekit-demo-root [data-block-id][data-selected] { background: var(--accent-subtle); border-radius: 4px; }

/* drag-to-reorder handle */
.writekit-demo-root .writekit-drag-handle { position: absolute; left: -1.4em; top: 0.2em; cursor: grab; color: var(--fg-subtle); user-select: none; opacity: 0; transition: opacity 0.1s; line-height: 1.4; }
.writekit-demo-root [data-block-id]:hover > .writekit-drag-handle { opacity: 1; }
.writekit-demo-root .writekit-drag-handle:hover { color: var(--fg-muted); }
.writekit-demo-root .writekit-drag-handle:active { cursor: grabbing; }

/* output panel */
.ed-output { margin-top: 0.75rem; }
.ed-stats { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; font-size: 13px; color: var(--fg-muted); }
.ed-stats b { color: var(--fg); font-variant-numeric: tabular-nums; }
.ed-stats code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; color: var(--accent-text); }
.ed-sel { min-width: 0; }
.ed-json-toggle { margin-left: auto; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--fg-muted); border-radius: 7px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: background 0.12s, color 0.12s; }
.ed-json-toggle:hover { background: var(--bg-inset); color: var(--fg); }
.ed-json { margin-top: 0.6rem; max-height: 320px; overflow: auto; background: var(--bg-inset); border: 1px solid var(--border); border-radius: 10px; padding: 0.9rem 1rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; line-height: 1.6; color: var(--fg-muted); white-space: pre; }

/* multiplayer */
.ed-collab-bar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.6rem; font-size: 13px; }
.ed-peer { display: inline-flex; align-items: center; gap: 6px; color: var(--fg-muted); font-weight: 500; }
.ed-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.ed-spacer { flex: 1; }
.ed-sync { font-size: 12px; font-weight: 600; border-radius: 999px; padding: 2px 10px; }
.ed-sync-ok { color: var(--accent-text); background: var(--accent-subtle); }
.ed-sync-pending { color: #b45309; background: rgba(245, 158, 11, 0.15); }
.ed-conn { border: 1px solid var(--border); border-radius: 8px; padding: 4px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.12s, color 0.12s, border-color 0.12s; }
.ed-conn-on { background: var(--accent); color: var(--accent-fg); border-color: transparent; }
.ed-conn-off { background: var(--bg-elevated); color: var(--fg-muted); }
.ed-collab-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
@media (min-width: 720px) { .ed-collab-grid { grid-template-columns: 1fr 1fr; } }
.ed-collab-grid .writekit-demo-root { border-radius: 12px; min-height: 200px; }
.writekit-demo-root.collab { position: relative; }
.ed-hint { margin-top: 0.6rem; font-size: 13px; color: var(--fg-subtle); }

/* remote cursors (component sets --cursor-color per peer) */
.writekit-remote-cursors { position: absolute; inset: 0; pointer-events: none; overflow: visible; z-index: 4; }
.writekit-remote-selection { position: absolute; background: var(--cursor-color); opacity: 0.22; border-radius: 2px; }
.writekit-remote-caret { position: absolute; width: 2px; background: var(--cursor-color); }
.writekit-remote-caret-label { position: absolute; top: -1.05em; left: -1px; font-size: 10px; line-height: 1; white-space: nowrap; color: #fff; background: var(--cursor-color); padding: 1px 4px; border-radius: 3px 3px 3px 0; }

/* floating menus (teleported to <body>) */
.writekit-bubble-menu { display: flex; gap: 2px; background: var(--bg-elevated); border: 1px solid var(--border-strong); border-radius: 8px; padding: 4px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18); z-index: 60; }
.writekit-bubble-menu button { min-width: 30px; height: 28px; padding: 0 8px; border: 0; background: transparent; color: var(--fg-muted); border-radius: 5px; cursor: pointer; font-size: 13px; text-transform: capitalize; }
.writekit-bubble-menu button:hover { background: var(--bg-inset); color: var(--fg); }
.writekit-bubble-menu button[data-active] { background: var(--accent); color: var(--accent-fg); }

.writekit-slash-menu { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 4px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16); width: 240px; max-height: 300px; overflow: auto; z-index: 60; }
.writekit-slash-menu button { display: flex; justify-content: space-between; align-items: baseline; width: 100%; text-align: left; border: 0; background: transparent; padding: 7px 10px; border-radius: 7px; cursor: pointer; font-size: 14px; color: var(--fg); }
.writekit-slash-menu button[data-highlighted] { background: var(--bg-inset); }
.writekit-slash-menu .slash-group { font-size: 11px; color: var(--fg-subtle); text-transform: capitalize; }
</style>
