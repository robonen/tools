<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectValueProps extends PrimitiveProps {
  /** Text shown when no option is selected. */
  placeholder?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useSelectRootContext } from './context';
import { shouldShowPlaceholder } from './utils';

const { as = 'span', placeholder } = defineProps<SelectValueProps>();

const { forwardRef } = useForwardExpose();
const rootCtx = useSelectRootContext();

const showPlaceholder = computed(() => shouldShowPlaceholder(rootCtx.value.value));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    style="pointer-events: none"
  >
    <template v-if="showPlaceholder">{{ placeholder }}</template>
    <template v-else>{{ rootCtx.displayValue.value }}</template>
  </Primitive>
</template>
