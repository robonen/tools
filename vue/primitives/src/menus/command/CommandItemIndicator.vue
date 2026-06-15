<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Renders its content only while the parent `CommandItem` matches the committed
 * `modelValue` — use it to show a check (or any marker) on the selected row of a
 * palette that keeps a persistent selection. Marked `aria-hidden` because the
 * selection state is already conveyed by the item's `aria-selected`.
 */
export interface CommandItemIndicatorProps extends PrimitiveProps {
  /** Render even when the parent item is not the committed selection. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useCommandItemContext } from './context';

const { as = 'span', forceMount = false } = defineProps<CommandItemIndicatorProps>();

const { forwardRef } = useForwardExpose();
const itemCtx = useCommandItemContext();
</script>

<template>
  <Primitive
    v-if="forceMount || itemCtx.isSelected.value"
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    data-primitives-command-item-indicator
  >
    <slot />
  </Primitive>
</template>
