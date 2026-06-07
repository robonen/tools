<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ComboboxLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useComboboxGroupContext } from './context';

const { as = 'div' } = defineProps<ComboboxLabelProps>();
const { forwardRef } = useForwardExpose();
const groupCtx = useComboboxGroupContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="groupCtx.id.value"
  >
    <slot />
  </Primitive>
</template>
