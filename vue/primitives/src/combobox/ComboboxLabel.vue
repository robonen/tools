<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * An accessible label for a ComboboxGroup. Its id is referenced by the group's
 * `aria-labelledby`, so place it as a direct child of ComboboxGroup.
 */
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
