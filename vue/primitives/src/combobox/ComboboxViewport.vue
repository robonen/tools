<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The scrollable region inside ComboboxContent that holds the items. Provides the overflow
 * container that keeps the highlighted item scrolled into view.
 */
export interface ComboboxViewportProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useComboboxContentContext } from './context';

const { as = 'div' } = defineProps<ComboboxViewportProps>();

const { forwardRef, currentElement } = useForwardExpose();
const contentCtx = useComboboxContentContext();

watchPostEffect(() => contentCtx.onViewportChange(currentElement.value));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="presentation"
    data-primitives-combobox-viewport
    style="position: relative; flex: 1 1 0%; overflow: hidden auto"
  >
    <slot />
  </Primitive>
</template>
