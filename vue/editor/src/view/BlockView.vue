<script lang="ts">
import type { Attrs, Node } from '../model';
</script>

<script setup lang="ts">
import type { IntrinsicElementAttributes } from 'vue';
import { computed } from 'vue';
import { nodeSelection } from '../model';
import { createTransaction } from '../state';
import { Primitive } from './primitive';
import { useEditorContext } from './context';
import TextBlockHost from './TextBlockHost.vue';

export interface BlockViewProps {
  block: Node;
}

const { block } = defineProps<BlockViewProps>();
const ctx = useEditorContext();

const def = computed(() => ctx.registry.getBlock(block.type));
const wrapperTag = computed<keyof IntrinsicElementAttributes>(() => (def.value?.as ?? 'div') as keyof IntrinsicElementAttributes);
const isText = computed(() => def.value?.spec.content.kind === 'text');
const atomComponent = computed(() => def.value?.component);
const isSelected = computed(() => {
  const sel = ctx.state.value.selection;
  return sel.kind === 'node' && sel.ids.includes(block.id);
});

function updateAttrs(attrs: Attrs): void {
  ctx.dispatch(createTransaction(ctx.editor.state).setAttrs(block.id, attrs).setSelection(ctx.editor.state.selection));
}

/** Clicking an atom block selects it as a node (so Backspace/Delete remove it). */
function onMousedown(event: MouseEvent): void {
  if (isText.value)
    return;

  // Don't hijack interactive controls inside the atom (e.g. image fields).
  if ((event.target as HTMLElement).closest('input, textarea, button, a, select'))
    return;

  event.preventDefault();
  ctx.dispatch(createTransaction(ctx.editor.state).setSelection(nodeSelection([block.id])));
  ctx.contentRoot.value?.focus({ preventScroll: true });
}

const DND_TYPE = 'application/x-robonen-editor-block';

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData(DND_TYPE, block.id);
  if (event.dataTransfer)
    event.dataTransfer.effectAllowed = 'move';
}

function onDragOver(event: DragEvent): void {
  if (event.dataTransfer?.types.includes(DND_TYPE))
    event.preventDefault(); // allow drop
}

function onDrop(event: DragEvent): void {
  const draggedId = event.dataTransfer?.getData(DND_TYPE);
  if (!draggedId || draggedId === block.id)
    return;

  event.preventDefault();
  const toIndex = ctx.editor.state.doc.content.findIndex(candidate => candidate.id === block.id);
  if (toIndex !== -1)
    ctx.dispatch(createTransaction(ctx.editor.state).moveBlock(draggedId, toIndex).setSelection(ctx.editor.state.selection));
}
</script>

<template>
  <Primitive
    :as="wrapperTag"
    :data-block-id="block.id"
    :data-block-type="block.type"
    :data-selected="isSelected ? '' : undefined"
    :data-draggable="ctx.config.draggable ? '' : undefined"
    :contenteditable="isText ? undefined : 'false'"
    @mousedown="onMousedown"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <span
      v-if="ctx.config.draggable"
      class="editor-drag-handle"
      data-editor-drag-handle=""
      contenteditable="false"
      draggable="true"
      aria-label="Drag to reorder"
      @mousedown.stop
      @dragstart="onDragStart"
    >⠿</span>
    <TextBlockHost
      v-if="isText && def"
      :block="block"
      :definition="def"
    />
    <component
      :is="atomComponent || 'div'"
      v-else-if="atomComponent"
      :node="block"
      :selected="isSelected"
      :editable="ctx.config.editable"
      :update="updateAttrs"
    />
  </Primitive>
</template>
