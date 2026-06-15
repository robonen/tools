<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A focusable control within a `ToolbarRoot`. Registers itself with the
 * toolbar's roving-focus collection so arrow keys can move to it, carrying the
 * single `tabindex="0"` only while it is the active item. Renders a `<button>`
 * by default; use `as` / `as="template"` to render a link or any other element.
 */
export interface ToolbarButtonProps extends PrimitiveProps {

  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useCollectionInjector } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { TOOLBAR_COLLECTION_KEY, useToolbarContext } from './context';

const { as = 'button', disabled = false } = defineProps<ToolbarButtonProps>();
const ctx = useToolbarContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector(TOOLBAR_COLLECTION_KEY);

const index = computed(() => (currentElement.value ? ctx.items.value.indexOf(currentElement.value) : -1));
const isActive = computed(() => index.value === ctx.activeIndex.value);

function onKeyDown(event: KeyboardEvent): void {
  // Track Shift+Tab so the toolbar drops out of the tab order on the way out.
  if (event.key === 'Tab' && event.shiftKey) {
    ctx.onItemShiftTab();
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
      :type="as === 'button' ? 'button' : undefined"
      :tabindex="disabled ? -1 : (isActive ? 0 : -1)"
      :disabled="disabled || undefined"
      :data-disabled="disabled ? '' : undefined"
      @keydown="onKeyDown"
      @focus="onFocus"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
