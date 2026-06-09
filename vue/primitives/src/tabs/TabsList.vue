<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Container that groups the tab triggers and exposes them as an ARIA `tablist`.
 * Place one inside `TabsRoot`, wrapping the set of `TabsTrigger` elements.
 */
export interface TabsListProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useTabsContext } from './context';

const { as = 'div' } = defineProps<TabsListProps>();
const { forwardRef } = useForwardExpose();
const ctx = useTabsContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="tablist"
    :aria-orientation="ctx.orientation.value"
    :data-orientation="ctx.orientation.value"
  >
    <slot />
  </Primitive>
</template>
