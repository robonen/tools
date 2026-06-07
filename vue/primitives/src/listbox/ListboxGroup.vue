<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ListboxGroupProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { provideListboxGroupContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { as = 'div' } = defineProps<ListboxGroupProps>();

const { forwardRef } = useForwardExpose();
const id = useId(undefined, 'listbox-group').value;

provideListboxGroupContext({ id });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="group"
    :aria-labelledby="id"
  >
    <slot />
  </Primitive>
</template>
