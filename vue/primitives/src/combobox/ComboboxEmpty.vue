<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ComboboxEmptyProps extends PrimitiveProps {
  /** Render even when items exist but none are filtered out. */
  always?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useComboboxRootContext } from './context';

const { as = 'div', always = false } = defineProps<ComboboxEmptyProps>();

const { forwardRef } = useForwardExpose();
const rootCtx = useComboboxRootContext();

const shouldRender = computed(() => {
  if (always) return true;
  return rootCtx.filterState.value.count === 0;
});
</script>

<template>
  <Primitive
    v-if="shouldRender"
    :ref="forwardRef"
    :as="as"
    role="presentation"
  >
    <slot />
  </Primitive>
</template>
