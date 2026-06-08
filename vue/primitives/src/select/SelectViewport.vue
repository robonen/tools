<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectViewportProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useSelectContentContext } from './context';

const { as = 'div' } = defineProps<SelectViewportProps>();

const { forwardRef, currentElement } = useForwardExpose();
const contentCtx = useSelectContentContext();

watchPostEffect(() => contentCtx.onViewportChange(currentElement.value));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="listbox"
    data-primitives-select-viewport
    style="overflow: auto; max-height: var(--primitives-select-content-available-height, 300px)"
  >
    <slot />
  </Primitive>
</template>
