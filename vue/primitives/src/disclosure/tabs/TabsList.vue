<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Container that groups the tab triggers and exposes them as an ARIA `tablist`.
 * Place one inside `TabsRoot`, wrapping the set of `TabsTrigger` elements.
 */
export interface TabsListProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { watchEffect } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useTabsContext } from './context';

const { as = 'div' } = defineProps<TabsListProps>();
const { forwardRef, currentElement } = useForwardExpose();
const ctx = useTabsContext();

// Surface the list element to the root so `TabsIndicator` can measure it.
watchEffect(() => {
  ctx.tabsListElement.value = currentElement.value;
});
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
