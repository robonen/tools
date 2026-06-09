<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The accessible label for a `ListboxGroup`. Its id is wired to the group's
 * `aria-labelledby`, so place it inside the group to name the set of items.
 */
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
