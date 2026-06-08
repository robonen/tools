<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface TabsContentProps extends PrimitiveProps {
  /** Value that links this panel to a trigger. */
  value: string;
  /** Keep content mounted even when inactive. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useTabsContext } from './context';

const { value, forceMount = false, as = 'div' } = defineProps<TabsContentProps>();

const { forwardRef } = useForwardExpose();
const ctx = useTabsContext();
const isSelected = computed(() => ctx.value.value === value);
</script>

<template>
  <Primitive
    v-if="forceMount || isSelected"
    :ref="forwardRef"
    :as="as"
    role="tabpanel"
    :data-state="isSelected ? 'active' : 'inactive'"
    :data-orientation="ctx.orientation.value"
    :tabindex="0"
    :hidden="forceMount && !isSelected ? true : undefined"
  >
    <slot :selected="isSelected" />
  </Primitive>
</template>
