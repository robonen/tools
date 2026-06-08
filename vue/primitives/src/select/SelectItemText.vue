<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectItemTextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useSelectItemContext } from './context';

const { as = 'span' } = defineProps<SelectItemTextProps>();

const { forwardRef, currentElement } = useForwardExpose();
const itemCtx = useSelectItemContext();

watchPostEffect(() => {
  itemCtx.onItemTextChange(currentElement.value);
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="itemCtx.textId.value"
  >
    <slot />
  </Primitive>
</template>
