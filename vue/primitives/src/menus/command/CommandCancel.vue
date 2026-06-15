<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A clear/reset affordance for the palette: on click it empties the search term,
 * refocuses the input, and — when `resetValue` is set — also clears the committed
 * `modelValue`. Renders a `<button>` by default. Pair it with `CommandInput`.
 */
export interface CommandCancelProps extends PrimitiveProps {
  /** Also clear the committed `modelValue`, not just the search term. */
  resetValue?: boolean;
  /** Accessible label for the control. @default 'Clear search' */
  label?: string;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useCommandContext } from './context';

const {
  as = 'button',
  resetValue = false,
  label = 'Clear search',
} = defineProps<CommandCancelProps>();

const { forwardRef } = useForwardExpose();
const ctx = useCommandContext();

function handleClick() {
  ctx.clear(resetValue);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :aria-label="label"
    tabindex="-1"
    data-primitives-command-cancel
    @click="handleClick"
  >
    <slot />
  </Primitive>
</template>
