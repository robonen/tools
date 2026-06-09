<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The visible label of a `SelectItem`. Its text is what the root captures to
 * show in `SelectValue` once the item is chosen, so each item should contain
 * exactly one; use inside a `SelectItem`.
 */
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
