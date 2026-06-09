<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The button that toggles the picker popover open and closed. Acts as the
 * Popper anchor (unless a custom `DatePickerAnchor` is present) and carries the
 * dialog-related ARIA wiring (`aria-haspopup`, `aria-expanded`, `aria-controls`).
 */
export interface DatePickerTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { onMounted } from 'vue';
import { PopperAnchor } from '../popper';
import { Primitive } from '../primitive';
import { useDatePickerRootContext } from './context';

const { as = 'button' } = defineProps<DatePickerTriggerProps>();

const ctx = useDatePickerRootContext();
const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => {
  ctx.triggerElement.value = currentElement.value;
});
</script>

<template>
  <component :is="ctx.hasCustomAnchor.value ? Primitive : PopperAnchor" as="template">
    <Primitive
      :id="ctx.triggerId.value"
      :ref="forwardRef"
      :as="as"
      :type="as === 'button' ? 'button' : undefined"
      aria-haspopup="dialog"
      :aria-expanded="ctx.open.value"
      :aria-controls="ctx.contentId.value"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      :data-primitives-date-picker-trigger="''"
      @click="ctx.onOpenToggle"
    >
      <slot />
    </Primitive>
  </component>
</template>
