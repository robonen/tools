<script lang="ts">
import type { PrimitiveProps } from './primitive';
</script>

<script setup lang="ts">
import { blockById, caret, createNode, inlineLength, inlineSlice, isCollapsed, nodeInline, sliceFromSelection } from '../model';
import { applyInputRule, deleteSelection, exitAtom, joinBackward, joinForward, replaceSelection } from '../commands';
import { createTransaction } from '../state';
import { Primitive } from './primitive';
import { useWritekitContext } from './context';
import { isInteractiveTarget } from './interactive';
import { parseRuns, renderRuns } from './inline-content';
import { closestBlockHost, positionFromPoint } from './selection';
import { readSlice, writeSlice } from './clipboard';
import { deletionDirection, isNativeInlineEdit, isTextInsertion, ownedEdit } from './input/native-edits';
import BlockView from './BlockView.vue';

export interface WritekitContentProps extends PrimitiveProps {}

const { as = 'div' } = defineProps<WritekitContentProps>();
const ctx = useWritekitContext();

const history = {
  undo: () => ctx.writekit.undo(),
  redo: () => ctx.writekit.redo(),
};

function setContentRoot(el: unknown): void {
  ctx.contentRoot.value = (el as HTMLElement | null) ?? null;
}

/**
 * The contract with the browser: it may edit inline text inside one block on
 * its own (synced from the DOM on `input`); everything else — structure, the
 * clipboard, drops, history, formatting — is either a command over the model
 * or cancelled. A single contenteditable spans every block, so any native
 * edit that crosses a block boundary rewrites DOM the model never agreed to.
 */
function onBeforeInput(event: InputEvent): void {
  if (ctx.composing.value || isInteractiveTarget(event.target))
    return;

  const type = event.inputType;
  const owned = ownedEdit(type, history);

  // With an atom selected the native range wraps the block element.
  if (ctx.writekit.state.selection.kind === 'node') {
    event.preventDefault();

    if (type.startsWith('delete'))
      ctx.writekit.command(deleteSelection);
    else if (type === 'insertParagraph')
      ctx.writekit.command(exitAtom);
    else if (owned)
      ctx.writekit.command(owned);

    return;
  }

  const sel = ctx.selection.read();
  if (!sel || sel.kind !== 'text')
    return;

  // A range: replaced, deleted or refused — never edited natively.
  if (!isCollapsed(sel)) {
    event.preventDefault();

    if (owned)
      ctx.writekit.command(owned);
    else if (isTextInsertion(type) && event.data)
      ctx.writekit.command(replaceSelection(inlineSlice([{ text: event.data, marks: ctx.writekit.state.storedMarks ?? [] }], focusedType(sel.focus.blockId))));
    else if (isTextInsertion(type) || type.startsWith('delete'))
      ctx.writekit.command(deleteSelection);

    return;
  }

  if (owned) {
    event.preventDefault();
    ctx.writekit.command(owned);
    return;
  }

  if (!isNativeInlineEdit(type)) {
    event.preventDefault();
    return;
  }

  // Deleting across a block edge joins blocks — whatever the granularity.
  const direction = deletionDirection(type);
  if (!direction)
    return;

  const block = blockById(ctx.writekit.state.doc, sel.focus.blockId);
  const length = block ? inlineLength(nodeInline(block)) : 0;

  if (direction === 'backward' && sel.focus.offset === 0) {
    event.preventDefault();
    ctx.writekit.command(joinBackward);
  }
  else if (direction === 'forward' && sel.focus.offset === length) {
    event.preventDefault();
    ctx.writekit.command(joinForward);
  }
}

/** The type of the block the caret is in — typed text continues that block, whatever it is. */
function focusedType(blockId: string): string {
  return blockById(ctx.writekit.state.doc, blockId)?.type ?? 'paragraph';
}

/**
 * Sync the model from the DOM after a native intra-block edit. The DOM is
 * trusted only while it is the DOM writekit painted: the host the selection
 * sits in is the registered one, still attached, with no block markup inside.
 * Anything else means the browser restructured the block — the model is not
 * updated from the damage, and a host that is still attached is repainted.
 */
function onInput(event?: Event): void {
  if (ctx.composing.value || (event && isInteractiveTarget(event.target)))
    return;

  const sel = ctx.selection.read();
  if (!sel || sel.kind !== 'text')
    return;

  const host = ctx.blockElements.get(sel.focus.blockId);
  const block = blockById(ctx.writekit.state.doc, sel.focus.blockId);
  if (!host || !block || ctx.writekit.state.schema.nodeSpec(block.type)?.content.kind !== 'text')
    return;

  const live = closestBlockHost(getSelection()?.anchorNode ?? null);
  if (!host.isConnected || live !== host) {
    if (__DEV__)
      console.warn('[writekit] The edited block host is not the one writekit painted; the edit was not synced.', block.id);
    return;
  }

  if (host.querySelector('[data-block-id], [data-block-content]')) {
    if (__DEV__)
      console.warn('[writekit] Foreign block markup inside a block host; repainting it from the model.', block.id);
    renderRuns(host, nodeInline(block), ctx.registry);
    ctx.selection.write(ctx.writekit.state.selection);
    return;
  }

  const runs = parseRuns(host, ctx.registry);
  ctx.writekit.dispatch(createTransaction(ctx.writekit.state)
    .setBlockContent(sel.focus.blockId, runs)
    .setSelection(sel)
    .setMeta('origin', sel.focus.blockId)); // suppress repaint of the block we just typed in

  // Markdown-style shortcuts: '# ' → heading, '- ' → list, '> ' → quote, …
  ctx.writekit.command(applyInputRule);
}

// ── clipboard ───────────────────────────────────────────────────

function onCopy(event: ClipboardEvent, cut = false): void {
  if (isInteractiveTarget(event.target) || !event.clipboardData)
    return;

  const slice = sliceFromSelection(ctx.writekit.state.doc, ctx.writekit.state.selection);
  if (!slice)
    return;

  event.preventDefault();
  writeSlice(event.clipboardData, slice, ctx.registry);

  if (cut && ctx.config.editable)
    ctx.writekit.command(deleteSelection);
}

function onPaste(event: ClipboardEvent): void {
  if (!ctx.config.editable || ctx.composing.value || isInteractiveTarget(event.target) || !event.clipboardData)
    return;

  event.preventDefault();

  const plain = ctx.pastePlain.value;
  ctx.pastePlain.value = false;

  insertPayload(event.clipboardData, plain);
}

/** A fragment from the payload into the selection; files go to the app. */
function insertPayload(data: DataTransfer, plain = false): void {
  const slice = readSlice(data, ctx.registry, { plain });

  if (slice) {
    ctx.writekit.command(replaceSelection(slice));
    return;
  }

  const files = Array.from(data.files);
  if (files.length > 0)
    ctx.onPasteFiles(files, ctx.writekit.state.selection);
}

// ── native drag & drop ──────────────────────────────────────────

/**
 * Nothing inside the editor is draggable natively: a dragged text range
 * would be deleted by the browser and re-inserted as foreign DOM. Blocks
 * move through the gutter handle; drops from outside land as a paste.
 */
function onDragStart(event: DragEvent): void {
  event.preventDefault();
}

function onDragOver(event: DragEvent): void {
  if (!ctx.config.editable || !event.dataTransfer)
    return;

  event.preventDefault(); // required for `drop` to fire
  event.dataTransfer.dropEffect = 'copy';
}

function onDrop(event: DragEvent): void {
  if (!ctx.config.editable || !event.dataTransfer)
    return;

  event.preventDefault();

  const root = ctx.contentRoot.value;
  const at = root ? positionFromPoint(event.clientX, event.clientY, root, ctx.selection.domPointToOffset) : null;

  if (at)
    ctx.writekit.dispatch(createTransaction(ctx.writekit.state).setSelection(caret(at.blockId, at.offset)).setMeta('selectionOnly', true));

  insertPayload(event.dataTransfer);
}

/**
 * A click on the root's own padding below the last block means "write here".
 * When the document ends in an atom there is no text position to click into at
 * all — without this the only way to continue writing was the keyboard path
 * (select the atom, press Enter). Ends-in-text just places the caret at the end.
 */
function onRootPointerDown(event: PointerEvent): void {
  if (!ctx.config.editable || event.target !== ctx.contentRoot.value)
    return;

  const last = ctx.writekit.state.doc.content.at(-1);
  if (!last)
    return;

  const lastEl = ctx.blockViews.get(last.id) ?? null;
  if (lastEl && event.clientY <= lastEl.getBoundingClientRect().bottom)
    return;

  event.preventDefault();

  if (ctx.writekit.state.schema.nodeSpec(last.type)?.content.kind === 'text') {
    ctx.writekit.dispatch(createTransaction(ctx.writekit.state)
      .setSelection(caret(last.id, inlineLength(nodeInline(last)))));
    return;
  }

  if (!ctx.writekit.state.registry.hasBlock('paragraph'))
    return;

  const paragraph = createNode('paragraph');
  ctx.writekit.dispatch(createTransaction(ctx.writekit.state)
    .insertBlock(paragraph, ctx.writekit.state.doc.content.length)
    .setSelection(caret(paragraph.id, 0)));
}

function onCompositionStart(event: CompositionEvent): void {
  if (isInteractiveTarget(event.target))
    return;
  ctx.composing.value = true;
}

function onCompositionEnd(event: CompositionEvent): void {
  if (isInteractiveTarget(event.target))
    return;
  ctx.composing.value = false;
  onInput();
}
</script>

<template>
  <Primitive
    :ref="setContentRoot"
    :as="as"
    role="textbox"
    aria-multiline="true"
    :aria-readonly="!ctx.config.editable || undefined"
    data-writekit-content=""
    :contenteditable="ctx.config.editable ? 'true' : 'false'"
    :spellcheck="ctx.config.spellcheck"
    @beforeinput="onBeforeInput"
    @input="onInput"
    @copy="onCopy($event)"
    @cut="onCopy($event, true)"
    @paste="onPaste"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @drop="onDrop"
    @pointerdown="onRootPointerDown"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
  >
    <BlockView
      v-for="block in ctx.state.value.doc.content"
      :key="block.id"
      :block="block"
    />
  </Primitive>
</template>
