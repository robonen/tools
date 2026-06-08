<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectTriggerProps extends PrimitiveProps {
  /** Disable this trigger independently from the root. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { PopperAnchor } from '../popper';
import { Primitive } from '../primitive';
import { useSelectRootContext } from './context';
import { getOpenState } from './utils';

const { as = 'button', disabled = false } = defineProps<SelectTriggerProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();

const isDisabled = computed(() => rootCtx.disabled.value || disabled);

watchEffect(() => rootCtx.onTriggerChange(currentElement.value));
onBeforeUnmount(() => rootCtx.onTriggerChange(undefined));

function handlePointerDown(event: PointerEvent) {
  if (isDisabled.value) return;
  if (event.button !== 0 || event.ctrlKey) return;
  event.preventDefault();
  rootCtx.onOpenChange(true);
}

function handleKeyDown(event: KeyboardEvent) {
  if (isDisabled.value) return;
  if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    rootCtx.onOpenChange(true);
  }
}
</script>

<template>
  <PopperAnchor>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="combobox"
      type="button"
      :aria-controls="rootCtx.contentId.value"
      :aria-expanded="rootCtx.open.value"
      :aria-required="rootCtx.required.value || undefined"
      :data-state="getOpenState(rootCtx.open.value)"
      :disabled="isDisabled || undefined"
      :data-disabled="isDisabled ? '' : undefined"
      :data-placeholder="!rootCtx.value.value ? '' : undefined"
      @pointerdown="handlePointerDown"
      @keydown="handleKeyDown"
    >
      <slot />
    </Primitive>
  </PopperAnchor>
</template>
