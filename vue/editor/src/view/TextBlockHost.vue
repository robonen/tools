<script lang="ts">
import type { Node } from '../model';
import type { BlockDefinition } from '../registry';
</script>

<script setup lang="ts">
import type { IntrinsicElementAttributes } from 'vue';
import { computed, onBeforeUnmount, watch } from 'vue';
import { inlineLength, nodeInline } from '../model';
import { Primitive } from './primitive';
import { useEditorContext } from './context';
import { renderRuns } from './inline-content';

export interface TextBlockHostProps {
  block: Node;
  definition: BlockDefinition;
}

const { block, definition } = defineProps<TextBlockHostProps>();
const ctx = useEditorContext();

let hostEl: HTMLElement | null = null;

/** The element's tag — derived from the block's `toDOM` (h1, p, …). */
const tag = computed<keyof IntrinsicElementAttributes>(() => {
  const out = definition.spec.toDOM?.(block);
  if (typeof out === 'string')
    return out as keyof IntrinsicElementAttributes;
  if (Array.isArray(out) && typeof out[0] === 'string')
    return out[0] as keyof IntrinsicElementAttributes;
  return (definition.as ?? 'div') as keyof IntrinsicElementAttributes;
});

const isEmpty = computed(() => inlineLength(nodeInline(block)) === 0);

/** Element attributes contributed by the block's `toDOM` (e.g. callout/list styling). */
const hostAttrs = computed<Record<string, string>>(() => {
  const out = definition.spec.toDOM?.(block);
  if (Array.isArray(out) && out.length > 1) {
    const second = out[1];
    if (second && typeof second === 'object' && !Array.isArray(second))
      return second as Record<string, string>;
  }
  return {};
});

/**
 * Function ref: fires when the element is created or replaced (e.g. a heading
 * level change swaps the tag). Registers the element and paints its inline
 * content imperatively. The element is NOT itself contenteditable — the single
 * editable root is the ancestor EditorContent — but Vue must never diff this
 * inner DOM, which is what keeps the caret stable.
 */
function setHost(el: unknown): void {
  const node = (el as HTMLElement | null) ?? null;
  hostEl = node;

  if (node) {
    ctx.blockElements.set(block.id, node);
    renderRuns(node, nodeInline(block), ctx.registry);
  }
}

onBeforeUnmount(() => ctx.blockElements.delete(block.id));

// Re-paint only for foreign changes (undo/redo, commands, remote, another block)
// — never for our own keystrokes (origin === block.id), where the DOM is current.
watch(
  () => block.content,
  () => {
    if (ctx.composing.value || ctx.lastOrigin.value === block.id || !hostEl)
      return;
    renderRuns(hostEl, nodeInline(block), ctx.registry);
  },
  { flush: 'post' },
);
</script>

<template>
  <Primitive
    :ref="setHost"
    :as="tag"
    v-bind="hostAttrs"
    data-block-content=""
    :data-block-id="block.id"
    :data-empty="isEmpty ? '' : undefined"
    :data-placeholder="definition.placeholder"
  />
</template>
