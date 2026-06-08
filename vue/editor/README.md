# @robonen/editor

A headless, block-based rich-text editor for Vue 3 — in the spirit of Tiptap / ProseMirror / Editor.js, but with a **hand-built CRDT** for collaboration (no Yjs/Loro/Automerge).

- **Block registry + schema** — blocks and inline marks are modular, registered through a registry that projects an immutable schema.
- **Single contenteditable** — one editable surface (ProseMirror/Tiptap model), so native cross-block mouse selection and arrow navigation behave like a normal document.
- **Framework-agnostic core** — the model, schema, registry, state, commands and keymap are DOM-free and Vue-free; the Vue layer is only rendering + input.
- **Step-based transactions** with exact inverses → real undo/redo, and the same steps drive the CRDT.
- **Own CRDT** (`@robonen/crdt`) behind a pluggable `CrdtProvider` — RGA text, fractional-indexed blocks, Peritext-style marks, version-vector sync, presence/cursors.

> Status: v0 / work in progress. Logic is covered by unit + convergence tests; the contenteditable/Playwright tests run locally (not in CI sandboxes).

## Install

```bash
pnpm add @robonen/editor @robonen/crdt vue
```

## Quick start

```vue
<script setup lang="ts">
import { createDefaultRegistry, createEditor, createEditorState, EditorRoot } from '@robonen/editor';

const registry = createDefaultRegistry();
const editor = createEditor({ state: createEditorState({ registry }) });
</script>

<template>
  <EditorRoot :editor="editor" autofocus class="editor" />
</template>
```

`EditorRoot`'s default slot renders `EditorContent` (the single contenteditable). Provide your own slot to add UI around it:

```vue
<EditorRoot :editor="editor" autofocus>
  <EditorContent />
  <EditorBubbleMenu />   <!-- formatting toolbar on selection -->
  <EditorSlashMenu />    <!-- `/` to insert blocks -->
</EditorRoot>
```

The package is **headless**: it ships behavior and DOM structure (`data-block-*`, `data-editor-*` hooks), not styling. See `playground/src/App.vue` for a complete stylesheet.

## Blocks & marks

Built-in blocks (via `createDefaultRegistry()`): `paragraph`, `heading` (1–6), `bulleted-list` / `numbered-list` / `todo-list` (flat-with-indent), `blockquote`, `code-block`, `callout`, `divider`, `image`. Built-in marks: `bold`, `italic`, `underline`, `strike`, `highlight`, `code`, `link`.

Add your own — no core changes needed:

```ts
import { createRegistry, defineBlock, defineMark, defaultBlocks, defaultMarks } from '@robonen/editor';

const spoiler = defineMark({
  type: 'spoiler',
  spec: { toDOM: () => ['span', { 'data-spoiler': '' }, 0], parseDOM: [{ tag: 'span[data-spoiler]' }] },
});

const registry = createRegistry({ blocks: defaultBlocks, marks: [...defaultMarks, spoiler] });
```

## Editing UX

- **Slash menu** — `EditorSlashMenu`: type `/` at the start of a line; items come from each block's `meta`.
- **Bubble toolbar** — `EditorBubbleMenu`: floats over a text selection (positioned with `@floating-ui/vue`); override the buttons via its default slot (`#default="{ active, toggle }"`).
- **Markdown input rules** — `# `→heading, `- `/`* `→bulleted list, `1. `→numbered list, `> `→quote, `[] `→to-do.
- **Drag to reorder** — pass `draggable` to `EditorRoot` for per-block drag handles.
- **Hotkeys** — `Mod-b/i/u`, `Mod-Shift-s` (strike), `Mod-e` (code), `Mod-z` / `Mod-Shift-z`, `Enter` (split), `Shift-Enter` (hard break), `Backspace`/`Delete` at edges (merge), `Mod-a` (progressive select), `Mod-Alt-1..6` (heading), `Tab`/`Shift-Tab` (list indent).

## Commands

Commands are `(state, dispatch?, view?) => boolean` and power the keymap, UI, and programmatic edits:

```ts
import { toggleMark, setBlockType } from '@robonen/editor';

editor.command(toggleMark('bold'));
editor.command(setBlockType('heading', { level: 2 }));
```

Called without `dispatch` they are a dry run (for disabled/active toolbar state).

## Collaboration (own CRDT)

The editor is CRDT-agnostic behind `CrdtProvider`. The built-in provider maps editor steps to CRDT ops (blocks → fractional-indexed set, text → RGA, formatting → mark store) and syncs op batches over any transport.

```ts
import { bindCrdt, createNativeProvider } from '@robonen/editor';

// First peer seeds the document.
const provider = createNativeProvider({ schema: registry.schema, doc: editor.state.doc, user: { name: 'Alice', color: '#2563eb' } });
const binding = bindCrdt(editor, provider);

// Wire a transport (BroadcastChannel / WebSocket / …):
provider.onLocalOps(bytes => channel.postMessage(bytes));
channel.onmessage = e => provider.applyUpdate(e.data);

// A joining peer starts empty and syncs:
//   const provider = createNativeProvider({ schema });
//   provider.applyUpdate(remoteFullState);   // = peerA.encodeDelta()
```

Presence/cursors travel on a separate ephemeral channel and render with `EditorRemoteCursors`:

```ts
provider.onLocalAwareness(bytes => channel.postMessage(bytes));
const cursors = ref([]);
provider.onAwareness(next => cursors.value = next);
```

```vue
<EditorRoot :editor="editor">
  <EditorContent />
  <EditorRemoteCursors :cursors="cursors" />
</EditorRoot>
```

See the **Collaboration** demo in the playground for a full two-replica example.

Applying a remote change is **per-block**: `bindCrdt` reuses the node identity of every block a remote edit didn't touch, so only changed blocks repaint and the local caret in untouched blocks is undisturbed.

For long-lived sessions, compact tombstones once the replicas are quiesced and fully synced:

```ts
provider.gc(); // drops deleted characters / removed blocks safe to forget
```

### Known limitations (documented, deferred)

- A local caret does not auto-shift when a remote peer inserts text *before* it (the caret keeps its offset).
- Concurrent split/merge of the exact same range can drop a mark recreated on the moved tail.
- `gc()` is only safe at quiescence (no in-flight ops) — it has no built-in stability protocol; drive it from your sync layer.

## Development

```bash
pnpm --filter @robonen/editor test          # logic (jsdom) + CRDT convergence
pnpm --filter @robonen/editor build         # tsdown (ESM + CJS + dts)
pnpm --filter @robonen/editor-playground dev
```

See [AGENTS.md](./AGENTS.md) for the architecture and contributor notes.
