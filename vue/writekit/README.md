# @robonen/writekit

A headless, block-based rich-text writekit for Vue 3 — in the spirit of Tiptap / ProseMirror / Editor.js, but with a **hand-built CRDT** for collaboration (no Yjs/Loro/Automerge).

- **Block registry + schema** — blocks and inline marks are modular, registered through a registry that projects an immutable schema.
- **Single contenteditable** — one editable surface (ProseMirror/Tiptap model), so native cross-block mouse selection and arrow navigation behave like a normal document.
- **Framework-agnostic core** — the model, schema, registry, state, commands and keymap are DOM-free and Vue-free; the Vue layer is only rendering + input.
- **Step-based transactions** with exact inverses → real undo/redo, and the same steps drive the CRDT.
- **Own CRDT** (`@robonen/crdt`) behind a pluggable `CrdtProvider` — RGA text, fractional-indexed blocks, Peritext-style marks, version-vector sync, presence/cursors.

> Status: v0 / work in progress. Logic is covered by unit + convergence tests; the contenteditable/Playwright tests run locally (not in CI sandboxes).

## Install

```bash
pnpm add @robonen/writekit @robonen/crdt vue
```

## Quick start

```vue
<script setup lang="ts">
import { createDefaultRegistry, createWritekit, createWritekitState, WritekitRoot } from '@robonen/writekit';

const registry = createDefaultRegistry();
const writekit = createWritekit({ state: createWritekitState({ registry }) });
</script>

<template>
  <WritekitRoot :writekit="writekit" autofocus class="writekit" />
</template>
```

`WritekitRoot`'s default slot renders `WritekitContent` (the single contenteditable). Provide your own slot to add UI around it:

```vue
<WritekitRoot :writekit="writekit" autofocus>
  <WritekitContent />
  <WritekitBubbleMenu />   <!-- formatting toolbar on selection -->
  <WritekitSlashMenu />    <!-- `/` to insert blocks -->
</WritekitRoot>
```

The package is **headless**: it ships behavior and DOM structure (`data-block-*`, `data-writekit-*` hooks), not styling. See `playground/src/App.vue` for a complete stylesheet.

## Blocks & marks

Built-in blocks (via `createDefaultRegistry()`): `paragraph`, `heading` (1–6), `bulleted-list` / `numbered-list` / `todo-list` (flat-with-indent), `blockquote`, `code-block`, `callout`, `divider`, `image`. Built-in marks: `bold`, `italic`, `underline`, `strike`, `highlight`, `code`, `link`.

Add your own — no core changes needed:

```ts
import { createRegistry, defineBlock, defineMark, defaultBlocks, defaultMarks } from '@robonen/writekit';

const spoiler = defineMark({
  type: 'spoiler',
  spec: { toDOM: () => ['span', { 'data-spoiler': '' }, 0], parseDOM: [{ tag: 'span[data-spoiler]' }] },
});

const registry = createRegistry({ blocks: defaultBlocks, marks: [...defaultMarks, spoiler] });
```

## Editing UX

- **Slash menu** — `WritekitSlashMenu`: type `/` at the start of a line; items come from each block's `meta`.
- **Bubble toolbar** — `WritekitBubbleMenu`: floats over a text selection (positioned with `@floating-ui/vue`); override the buttons via its default slot (`#default="{ active, toggle }"`).
- **Markdown input rules** — `# `→heading, `- `/`* `→bulleted list, `1. `→numbered list, `> `→quote, `[] `→to-do.
- **Block gutter** — `WritekitBlockGutter` floats beside the hovered block; put a `WritekitBlockHandle` (drag to reorder, click for a block menu: turn into, duplicate, move, delete, plus your own items via `#menu`) and a `WritekitBlockInserter` (a "+" that opens a picker of every block type and inserts the choice below, or above with Alt) inside it. Replaces the old `draggable` prop.
- **Clipboard** — copy/cut/paste go through the model: paste reads `text/html` (Google Docs, Word, browsers), plain text (markdown-style lines become blocks), and writekit's own lossless format, filtered to the registry's `parseDOM` rules so no foreign DOM or styling reaches the editable. `Mod-Shift-V` pastes as plain text; dropped text/HTML lands as a paste, and pasted/dropped files reach the `pasteFiles` event.
- **Hotkeys** — `Mod-b/i/u`, `Mod-Shift-s` (strike), `Mod-e` (code), `Mod-z` / `Mod-Shift-z`, `Enter` (split), `Shift-Enter` (hard break), `Backspace`/`Delete` at edges (merge), `Mod-a` (progressive select), `Mod-Alt-1..6` (heading), `Tab`/`Shift-Tab` (list indent), `Mod-Shift-v` (paste as plain text).

## Commands

Commands are `(state, dispatch?, view?) => boolean` and power the keymap, UI, and programmatic edits:

```ts
import { toggleMark, setBlockType } from '@robonen/writekit';

writekit.command(toggleMark('bold'));
writekit.command(setBlockType('heading', { level: 2 }));
```

Called without `dispatch` they are a dry run (for disabled/active toolbar state).

## Collaboration (own CRDT)

The writekit is CRDT-agnostic behind `CrdtProvider`. The built-in provider maps writekit steps to CRDT ops (blocks → fractional-indexed set, text → RGA, formatting → mark store) and syncs op batches over any transport.

```ts
import { bindCrdt, createNativeProvider } from '@robonen/writekit';

// First peer seeds the document.
const provider = createNativeProvider({ schema: registry.schema, doc: writekit.state.doc, user: { name: 'Alice', color: '#2563eb' } });
const binding = bindCrdt(writekit, provider);

// Wire a transport (BroadcastChannel / WebSocket / …):
provider.onLocalOps(bytes => channel.postMessage(bytes));
channel.onmessage = e => provider.applyUpdate(e.data);

// A joining peer starts empty and syncs:
//   const provider = createNativeProvider({ schema });
//   provider.applyUpdate(remoteFullState);   // = peerA.encodeDelta()
```

Presence/cursors travel on a separate ephemeral channel and render with `WritekitRemoteCursors`:

```ts
provider.onLocalAwareness(bytes => channel.postMessage(bytes));
const cursors = ref([]);
provider.onAwareness(next => cursors.value = next);
```

```vue
<WritekitRoot :writekit="writekit">
  <WritekitContent />
  <WritekitRemoteCursors :cursors="cursors" />
</WritekitRoot>
```

See the **Collaboration** demo in the playground for a full two-replica example.

Applying a remote change is **per-block**: `bindCrdt` reuses the node identity of every block a remote edit didn't touch, so only changed blocks repaint and the local caret in untouched blocks is undisturbed.

For long-lived sessions, compact tombstones once the replicas are quiesced and fully synced:

```ts
provider.gc(); // drops deleted characters / removed blocks safe to forget
```

### Known limitations (documented, deferred)

- Dragging **text** with the mouse inside the editor is disabled: the browser would delete the range and re-insert it as foreign DOM across the single contenteditable. Blocks move via the gutter handle; drops from outside land as a paste. (Notion has the same limitation.)
- Inline markdown in a plain-text paste (`**bold**`, `[x](url)`) is not parsed; only line-leading block markers (`# `, `- `, `> `) are.
- A local caret does not auto-shift when a remote peer inserts text *before* it (the caret keeps its offset).
- Concurrent split/merge of the exact same range can drop a mark recreated on the moved tail.
- `gc()` is only safe at quiescence (no in-flight ops) — it has no built-in stability protocol; drive it from your sync layer.

## Development

```bash
pnpm --filter @robonen/writekit test          # logic (jsdom) + CRDT convergence
pnpm --filter @robonen/writekit build         # tsdown (ESM + CJS + dts)
pnpm --filter @robonen/writekit-playground dev
```

See [AGENTS.md](./AGENTS.md) for the architecture and contributor notes.
