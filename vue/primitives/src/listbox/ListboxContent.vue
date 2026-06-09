<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The scrollable list container (`role="listbox"`) that wraps the items. It
 * receives focus, owns the keyboard handlers (navigation, enter, type-ahead),
 * and exposes the collection of items to the root.
 */
export interface ListboxContentProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { ref } from 'vue';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { useListboxRootContext } from './context';

// Module-scoped to avoid re-allocating on every keydown.
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

const { as = 'div' } = defineProps<ListboxContentProps>();

const ctx = useListboxRootContext();
const { forwardRef } = useForwardExpose();
const { CollectionSlot } = useCollectionInjector();

const isClickFocus = ref(false);

function onMouseDown(event: MouseEvent): void {
  if (event.button !== 0) return;
  isClickFocus.value = true;
  setTimeout(() => {
    isClickFocus.value = false;
  }, 10);
}

function onFocus(event: FocusEvent): void {
  if (isClickFocus.value) return;
  ctx.onEnter(event);
}

function onKeyDown(event: KeyboardEvent): void {
  const { key } = event;
  const o = ctx.orientation.value;
  if ((o === 'vertical' && (key === 'ArrowLeft' || key === 'ArrowRight'))
    || (o === 'horizontal' && (key === 'ArrowUp' || key === 'ArrowDown'))) return;

  if (key === 'Enter') return ctx.onKeydownEnter(event);

  if (NAV_KEYS.has(key)) {
    event.preventDefault();
    if (ctx.focusable.value) ctx.onKeydownNavigation(event);
    return;
  }
  ctx.onKeydownTypeAhead(event);
}
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="listbox"
      :tabindex="ctx.focusable.value ? (ctx.highlightedElement.value ? '-1' : '0') : '-1'"
      :aria-orientation="ctx.orientation.value"
      :aria-multiselectable="ctx.multiple.value ? true : undefined"
      :data-orientation="ctx.orientation.value"
      @mousedown="onMouseDown"
      @focus="onFocus"
      @keydown="onKeyDown"
    >
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
