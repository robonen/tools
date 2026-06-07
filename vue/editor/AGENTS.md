# AGENTS.md — @robonen/editor

Architecture and conventions for working in this package. Read this before editing.

## What it is

A headless block rich-text editor for Vue with a hand-built CRDT. **Do not reach for Yjs/Loro/Automerge** — collaboration is built on `@robonen/crdt` (sibling package in `core/crdt`).

## Editing model: single contenteditable

There is **one** `contenteditable` element — `EditorContent`. Blocks are plain child elements inside it; atom blocks (image, divider) are `contenteditable="false"` islands. We deliberately do **not** use per-block contenteditable: separate editing hosts make native cross-block mouse selection and arrow navigation impossible, which breaks the Word-like behavior we require.

Consequence: cross-block selection and caret navigation are handled natively by the browser; the model only mirrors the DOM selection as `{ blockId, offset }`. The cross-block arrow *commands* were intentionally deleted — don't re-add them.

## Layers (data flow is one-directional)

```
input/command → Transaction (steps) → dispatch → new EditorState → view reacts (+ CRDT)
```

All of these are **DOM-free and Vue-free** (typecheck/test under plain Node):

- `model/` — pure data: `EditorDocument`, `Node`, `Inline` (marked **runs**: `InlineNode[]`), `Mark`, `Position`, `Selection`. Inline formatting is *marked runs*, not flat-text-plus-ranges; every `applyStep` calls `normalizeInline` to merge adjacent equal-marks runs.
- `schema/` — `NodeSpec`/`MarkSpec`/`ContentKind` (3-variant union: text | container | atom), validation, normalization, `toDOM`/`parseDOM` descriptors.
- `registry/` — SSOT. `defineBlock`/`defineMark` are identity factories; `createRegistry` builds an immutable registry that **projects** the `Schema`. Adding a block/mark = a module + a line in a barrel — zero core changes.
- `state/` — `EditorState`, `Step` (atomic, invertible, serializable — the unit of undo **and** the CRDT contract), `Transaction` (fluent builder), `applyStep`/`applyTransaction`, `history`, `createEditor` (controller + `PubSub`).
- `commands/` — `(state, dispatch?, view?) => boolean`. One implementation, three consumers (keymap, UI, programmatic). `dispatch` omitted = dry run.
- `keymap/` — combo→command table, `Mod` normalization, one capture-phase keydown dispatcher on the root.

Vue layer (only this knows about the DOM):

- `view/` — `EditorRoot` (provider + keydown/selectionchange owner), `EditorContent` (THE contenteditable; owns beforeinput/input/composition), `BlockView` (resolves the block def; text → `TextBlockHost`, atom → the def's component), `TextBlockHost` (renders runs **imperatively** for caret stability), `inline-content/` (render/parse runs ↔ DOM), `selection/` (DOM ↔ model selection bridge), `ui/` (slash menu, bubble menu, remote cursors).
- `blocks/` — concrete blocks (+ `.vue` for atoms). `marks/` — concrete marks (data-only `toDOM`/`parseDOM`).
- `crdt/` — CRDT-agnostic `CrdtProvider` + `bindCrdt`; `native/` = the adapter over `@robonen/crdt`.
- `preset.ts` — `createDefaultRegistry()` / `createBasicRegistry()`.

## Caret stability (the #1 contenteditable risk)

`TextBlockHost` is **not** Vue-managed inside: children are written imperatively. While the user types, the **DOM is the source of truth** — on `input` we parse the DOM → a transaction tagged `meta('origin', blockId)`. We repaint a block only for *foreign* changes (undo/redo, command, remote CRDT), never for the block that originated the edit. Guards: skip while `composing`, skip on self-origin, save/restore the model selection across a repaint in `nextTick`.

When touching the view, preserve: `:key="block.id"`, the imperative inner render, and the origin/composing guards.

## CRDT mapping (`crdt/native/document-crdt.ts`)

`DocumentCrdt` maps the editor's **offset-based** steps ↔ **id-based** CRDT ops, and materializes an `EditorDocument`:

- Block list → fractional-indexed set: each block has `LwwRegister`s for `present`/`posKey`/`type`/`attrs` + an `Rga<string>` (text) + a `MarkStore`. `moveBlock` = change `posKey` (cheap).
- Text → `Rga` (one node per **UTF-16 code unit** — must match the editor's offset space; do not iterate code points).
- Marks → `MarkStore` (Peritext-ish spans anchored to char ids, LWW per char/type).

Invariants that have already bitten us — keep them:

- Block removal only sets `present=false`; the RGA chars stay. So **re-inserting an existing (tombstoned) block must reactivate it, not re-add content** (else it duplicates). `insertBlock`/`splitBlock` of an existing id take the reactivate path.
- `applyOp` returns `false` when a causal dependency is missing (block absent, RGA origin/char absent) so the `Replica` buffers and retries. `text-delete` must propagate `integrateDelete`'s result — don't hard-return `true`.
- Remote application flows through a single `setDoc` step (`REMOTE_ORIGIN`, `addToHistory:false`). `bindCrdt` never echoes a remote-origin transaction back into the provider. It runs `reconcileDoc` first (`crdt/reconcile.ts`) so unchanged blocks keep their node identity — only touched blocks repaint, and untouched carets are undisturbed. Preserve that deep-equal reuse.
- Tombstone GC (`Rga.gc` / `DocumentCrdt.gc` / `provider.gc()`) is safe **only at quiescence** (all peers synced, nothing in flight) — there's no stability protocol. It must keep mark-span endpoint chars (pass them via the `keep` predicate) or formatting on live chars between them is lost.

When changing the adapter, add/extend a two-replica convergence test in `crdt/__test__/convergence.test.ts` (dispatch → sync → assert documents equal, no duplication).

## Conventions

- TS strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Use `!`/guards on indexed access.
- ESLint (`compose(base, typescript, vue, imports, stylistic, …)`). `sort-imports` warnings are tolerated; **errors must be zero**. Run `pnpm --filter @robonen/editor lint:fix`.
  - Gotcha: the `prefer-includes` autofix once rewrote a private `indexOf` method into `this.includes(...)` (broken). If you have an array-like helper, avoid naming it `indexOf`.
- Build: `tsdown` (`tsconfig: ./tsconfig.src.json`), dual ESM/CJS + dts, subpath entries (`./crdt`, `./blocks`, …).
- Tests: vitest, two projects — `logic` (jsdom: model/schema/state/commands/crdt) and `view` (Playwright chromium: real contenteditable). **Chromium can't launch in the sandbox** — write a jsdom proof when possible; browser tests run locally.
- `Primitive`/`Slot`/`getRawChildren` and `useContextFactory`/`useEventListener` are **copied locally** under `view/` (we don't depend on `@robonen/vue`, whose dts build is currently broken).

## Milestones

M1 core + single-CE pivot · M2 rich blocks/marks · M2-UI slash/bubble/input-rules/drag · M3 own CRDT (`core/crdt` + native provider + awareness + collab demo) · M4 a11y + docs + CRDT optimizations (per-block patching, tombstone GC) — all done. Remaining: the Playwright `view` tests run locally only (chromium can't launch in the sandbox); run-length compression is still deferred.

The full plan lives at `~/.claude/plans/vue-memoized-torvalds.md`.
