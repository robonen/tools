<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CommandListProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useCommandContext } from './context';

const { as = 'div' } = defineProps<CommandListProps>();

const { forwardRef, currentElement } = useForwardExpose();
const ctx = useCommandContext();

let resizeObserver: ResizeObserver | undefined;
let observedChild: Element | undefined;

function setHeight(height: number) {
  const list = currentElement.value as HTMLElement | undefined;
  if (!list) return;
  list.style.setProperty('--primitives-command-list-height', `${height}px`);
}

function observeFirstChild() {
  const list = currentElement.value as HTMLElement | undefined;
  if (!list) return;
  const child = list.firstElementChild ?? undefined;
  if (child === observedChild) return;

  if (resizeObserver && observedChild) resizeObserver.unobserve(observedChild);
  observedChild = child;

  if (!child) {
    setHeight(0);
    return;
  }
  resizeObserver?.observe(child);
  setHeight((child as HTMLElement).offsetHeight);
}

onMounted(() => {
  const list = currentElement.value as HTMLElement | undefined;
  if (!list) return;
  ctx.setListElement(list);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        setHeight(target.offsetHeight);
      }
    });
  }

  observeFirstChild();

  // React to subtree changes (items added/removed/reordered).
  const mo = new MutationObserver(observeFirstChild);
  mo.observe(list, { childList: true });

  onBeforeUnmount(() => {
    mo.disconnect();
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    observedChild = undefined;
    ctx.setListElement(undefined);
  });
});

// Re-evaluate the observed child whenever the filter result changes (items hide/show).
watch(
  () => ctx.filteredItems.value,
  () => observeFirstChild(),
);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="ctx.listId.value"
    role="listbox"
    :aria-labelledby="ctx.labelId.value"
    data-primitives-command-list
  >
    <slot />
  </Primitive>
</template>
