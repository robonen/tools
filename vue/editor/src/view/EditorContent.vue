<script lang="ts">
import type { PrimitiveProps } from './primitive';
</script>

<script setup lang="ts">
import { blockById, caret, inlineLength, isCollapsed, nodeInline } from '../model';
import { applyInputRule, deleteSelection, insertHardBreak, joinBackward, joinForward, splitBlock } from '../commands';
import { createTransaction } from '../state';
import { Primitive } from './primitive';
import { useEditorContext } from './context';
import { isInteractiveTarget } from './interactive';
import { parseRuns } from './inline-content';
import BlockView from './BlockView.vue';

export interface EditorContentProps extends PrimitiveProps {}

const { as = 'div' } = defineProps<EditorContentProps>();
const ctx = useEditorContext();

function setContentRoot(el: unknown): void {
  ctx.contentRoot.value = (el as HTMLElement | null) ?? null;
}

/**
 * Intercept content mutations that the browser would handle incorrectly across
 * the single editable root: ranged edits (which could corrupt cross-block DOM)
 * and structural edits at block boundaries. Plain intra-block typing/deletion is
 * left to the browser and synced from the DOM on `input`.
 */
function onBeforeInput(event: InputEvent): void {
  if (ctx.composing.value || isInteractiveTarget(event.target))
    return;

  const type = event.inputType;
  if (!type.startsWith('insert') && !type.startsWith('delete'))
    return;

  const sel = ctx.selection.read();
  if (!sel || sel.kind !== 'text')
    return;

  // Ranged selection — we own it so cross-block deletes/inserts stay consistent.
  if (!isCollapsed(sel)) {
    event.preventDefault();
    ctx.editor.command(deleteSelection);

    const after = ctx.editor.state.selection;
    if (after.kind !== 'text')
      return;

    if ((type === 'insertText' || type === 'insertReplacementText' || type === 'insertCompositionText') && event.data) {
      ctx.editor.dispatch(createTransaction(ctx.editor.state)
        .insertText(after.focus, event.data, ctx.editor.state.storedMarks ?? [])
        .setSelection(caret(after.focus.blockId, after.focus.offset + event.data.length)));
    }
    else if (type === 'insertParagraph') {
      ctx.editor.command(splitBlock);
    }
    else if (type === 'insertLineBreak') {
      ctx.editor.command(insertHardBreak);
    }
    return;
  }

  // Collapsed — take over only structural edits and block-boundary deletions.
  const block = blockById(ctx.editor.state.doc, sel.focus.blockId);
  const atStart = sel.focus.offset === 0;
  const atEnd = block ? sel.focus.offset === inlineLength(nodeInline(block)) : false;

  switch (type) {
    case 'insertParagraph':
      event.preventDefault();
      ctx.editor.command(splitBlock);
      break;
    case 'insertLineBreak':
      event.preventDefault();
      ctx.editor.command(insertHardBreak);
      break;
    case 'deleteContentBackward':
      if (atStart) {
        event.preventDefault();
        ctx.editor.command(joinBackward);
      }
      break; // else: native deletes within the block, synced on `input`
    case 'deleteContentForward':
      if (atEnd) {
        event.preventDefault();
        ctx.editor.command(joinForward);
      }
      break;
    default:
      break; // insertText etc. → native, synced on `input`
  }
}

/** Sync the model from the DOM after a native intra-block edit (one block only). */
function onInput(event?: Event): void {
  if (ctx.composing.value || (event && isInteractiveTarget(event.target)))
    return;

  const sel = ctx.selection.read();
  if (!sel || sel.kind !== 'text')
    return;

  const host = ctx.blockElements.get(sel.focus.blockId);
  const block = blockById(ctx.editor.state.doc, sel.focus.blockId);
  if (!host || !block || ctx.editor.state.schema.nodeSpec(block.type)?.content.kind !== 'text')
    return;

  const runs = parseRuns(host, ctx.registry);
  ctx.editor.dispatch(createTransaction(ctx.editor.state)
    .setBlockContent(sel.focus.blockId, runs)
    .setSelection(sel)
    .setMeta('origin', sel.focus.blockId)); // suppress repaint of the block we just typed in

  // Markdown-style shortcuts: '# ' → heading, '- ' → list, '> ' → quote, …
  ctx.editor.command(applyInputRule);
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
    data-editor-content=""
    :contenteditable="ctx.config.editable ? 'true' : 'false'"
    :spellcheck="ctx.config.spellcheck"
    @beforeinput="onBeforeInput"
    @input="onInput"
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
