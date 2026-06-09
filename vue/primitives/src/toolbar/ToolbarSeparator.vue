<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A visual divider that delimits groups of controls inside a `ToolbarRoot`,
 * exposed as `role="separator"`. When `orientation` is omitted it inherits the
 * opposite of the toolbar's orientation (a horizontal toolbar gets a vertical
 * separator), so it sits correctly across the line of items by default.
 */
export interface ToolbarSeparatorProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';

}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useToolbarContext } from './context';

const { as = 'span', orientation } = defineProps<ToolbarSeparatorProps>();
const { forwardRef } = useForwardExpose();
const ctx = useToolbarContext();
// If no orientation passed, inherit from toolbar — but invert (horizontal toolbar needs vertical separator).
const effective = orientation ?? (ctx.orientation.value === 'horizontal' ? 'vertical' : 'horizontal');
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="separator"
    :aria-orientation="effective"
    :data-orientation="effective"
  >
    <slot />
  </Primitive>
</template>
