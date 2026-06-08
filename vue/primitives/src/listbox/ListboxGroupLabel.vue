<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ListboxGroupLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useListboxGroupContext } from './context';

const { as = 'div' } = defineProps<ListboxGroupLabelProps>();

const group = useListboxGroupContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="group.id"
  >
    <slot />
  </Primitive>
</template>
