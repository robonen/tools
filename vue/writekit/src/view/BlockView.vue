<script lang="ts">
import type { Attrs, Node } from '../model';
</script>

<script setup lang="ts">
import type { Component, IntrinsicElementAttributes } from 'vue';
import type { BlockDefinition } from '../registry';
import { computed, defineAsyncComponent, onBeforeUnmount } from 'vue';
import { nodeSelection } from '../model';
import { createTransaction } from '../state';
import { Primitive } from './primitive';
import { useWritekitContext } from './context';
import { isInteractiveControl } from './interactive';
import TextBlockHost from './TextBlockHost.vue';

export interface BlockViewProps {
  block: Node;
}

const { block } = defineProps<BlockViewProps>();
const ctx = useWritekitContext();

const def = computed(() => ctx.registry.getBlock(block.type));
const wrapperTag = computed<keyof IntrinsicElementAttributes>(() => (def.value?.as ?? 'div') as keyof IntrinsicElementAttributes);
const isText = computed(() => def.value?.spec.content.kind === 'text');
/**
 * A function-shaped `component` is a lazy loader; wrap it once per definition
 * so repeated renders reuse the same async component (and its resolved state)
 * instead of re-importing per block instance.
 */
const asyncCache = new WeakMap<() => Promise<unknown>, Component>();

function resolveComponent(raw: BlockDefinition['component']): Component | undefined {
  if (typeof raw !== 'function' || (raw as Component & { render?: unknown }).render || (raw as { setup?: unknown }).setup)
    return raw as Component | undefined;

  const loader = raw as () => Promise<Component | { default: Component }>;
  let wrapped = asyncCache.get(loader);

  if (!wrapped) {
    wrapped = defineAsyncComponent(() =>
      loader().then(m => ('default' in m ? m.default : m) as Component));
    asyncCache.set(loader, wrapped);
  }

  return wrapped;
}

const atomComponent = computed(() => resolveComponent(def.value?.component));
const isSelected = computed(() => {
  const sel = ctx.state.value.selection;
  return sel.kind === 'node' && sel.ids.includes(block.id);
});

/** The wrapper is what the gutter, the drag sensor and node selection address. */
function setWrapper(el: unknown): void {
  const node = (el as HTMLElement | null) ?? null;
  if (node)
    ctx.blockViews.set(block.id, node);
}

onBeforeUnmount(() => ctx.blockViews.delete(block.id));

function updateAttrs(attrs: Attrs): void {
  ctx.dispatch(createTransaction(ctx.writekit.state).setAttrs(block.id, attrs).setSelection(ctx.writekit.state.selection));
}

/** Clicking an atom block selects it as a node (so Backspace/Delete remove it). */
function onMousedown(event: MouseEvent): void {
  if (isText.value)
    return;

  // Don't hijack controls the atom renders for its own use — see
  // `isInteractiveControl` for why native tags alone are not enough, and why
  // the search is bounded to this block.
  if (isInteractiveControl(event.target, event.currentTarget as Element))
    return;

  event.preventDefault();
  ctx.dispatch(createTransaction(ctx.writekit.state).setSelection(nodeSelection([block.id])));
  ctx.contentRoot.value?.focus({ preventScroll: true });
}
</script>

<template>
  <Primitive
    :ref="setWrapper"
    :as="wrapperTag"
    :data-block-id="block.id"
    :data-block-type="block.type"
    :data-selected="isSelected ? '' : undefined"
    :contenteditable="isText ? undefined : 'false'"
    @mousedown="onMousedown"
  >
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
