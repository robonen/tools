<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ComboboxTriggerProps extends PrimitiveProps {
  /** Disable the trigger independently from the root. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useComboboxRootContext } from './context';
import { getOpenState } from './utils';

const { as = 'button', disabled = false } = defineProps<ComboboxTriggerProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useComboboxRootContext();

const isDisabled = computed(() => disabled || rootCtx.disabled.value);

watchPostEffect(() => rootCtx.onTriggerChange(currentElement.value));
onBeforeUnmount(() => rootCtx.onTriggerChange(undefined));

function handleClick(event: MouseEvent) {
  if (isDisabled.value) return;
  event.preventDefault();
  rootCtx.onOpenChange(!rootCtx.open.value);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    tabindex="-1"
    aria-haspopup="listbox"
    aria-label="Show options"
    :aria-controls="rootCtx.contentId.value"
    :aria-expanded="rootCtx.open.value"
    :aria-disabled="isDisabled || undefined"
    :disabled="isDisabled || undefined"
    :data-state="getOpenState(rootCtx.open.value)"
    :data-disabled="isDisabled ? '' : undefined"
    @click="handleClick"
  >
    <slot />
  </Primitive>
</template>
