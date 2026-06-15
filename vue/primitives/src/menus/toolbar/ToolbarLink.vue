<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A link within a `ToolbarRoot`, rendered as an `<a>` by default. It joins the
 * toolbar's roving-focus order like a `ToolbarButton`, and — because anchors do
 * not activate on Space natively — pressing Space triggers a click so keyboard
 * users can follow the link the same way they would a button.
 */
export interface ToolbarLinkProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useCollectionInjector } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { TOOLBAR_COLLECTION_KEY, useToolbarContext } from './context';

const { as = 'a' } = defineProps<ToolbarLinkProps>();
const ctx = useToolbarContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector(TOOLBAR_COLLECTION_KEY);

const index = computed(() => (currentElement.value ? ctx.items.value.indexOf(currentElement.value) : -1));
const isActive = computed(() => index.value === ctx.activeIndex.value);

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Tab' && event.shiftKey) {
    ctx.onItemShiftTab();
    return;
  }
  // Anchors do not fire a click on Space; do it ourselves so links behave like
  // the other toolbar controls.
  if (event.key === ' ' && event.target === event.currentTarget) {
    event.preventDefault();
    (event.currentTarget as HTMLElement | null)?.click();
    return;
  }
  if (!currentElement.value) return;
  ctx.onItemKeyDown(event, currentElement.value);
}
function onFocus(): void {
  if (currentElement.value) ctx.onItemFocus(currentElement.value);
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :as="as"
      :ref="forwardRef"
      :tabindex="isActive ? 0 : -1"
      @keydown="onKeyDown"
      @focus="onFocus"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
