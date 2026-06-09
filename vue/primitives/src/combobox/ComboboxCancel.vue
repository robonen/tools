<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that clears the current search term and refocuses the input. Typically shown
 * as an "x" inside the field while the user is typing.
 */
export interface ComboboxCancelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useComboboxRootContext } from './context';

const { as = 'button' } = defineProps<ComboboxCancelProps>();

const { forwardRef } = useForwardExpose();
const rootCtx = useComboboxRootContext();

function handleClick() {
  rootCtx.onSearchTermChange('');
  const input = rootCtx.inputElement.value;
  if (input) {
    input.value = '';
    input.focus();
  }
  rootCtx.onUserInputtedChange(false);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    tabindex="-1"
    aria-label="Clear"
    @click="handleClick"
  >
    <slot />
  </Primitive>
</template>
