<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useSelectGroupContext } from './context';

const { as = 'div' } = defineProps<SelectLabelProps>();
const { forwardRef } = useForwardExpose();
const groupCtx = useSelectGroupContext();
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
