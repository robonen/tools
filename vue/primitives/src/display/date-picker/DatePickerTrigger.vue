<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The button that toggles the picker popover open and closed. Acts as the
 * Popper anchor (unless a custom `DatePickerAnchor` is present) and carries the
 * dialog-related ARIA wiring (`aria-haspopup`, `aria-expanded`, `aria-controls`).
 */
export interface DatePickerTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { computed, onMounted } from 'vue';
import { PopperAnchor } from '../../overlays/popper';
import { Primitive } from '../../internal/primitive';
import { useDatePickerRootContext } from './context';

const { as = 'button' } = defineProps<DatePickerTriggerProps>();

const ctx = useDatePickerRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const disabled = computed(() => ctx.disabled.value);

function onClick() {
  if (disabled.value) return;
  ctx.onOpenToggle();
}

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
      :disabled="as === 'button' && disabled ? true : undefined"
      :aria-disabled="disabled ? true : undefined"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      :data-disabled="disabled ? '' : undefined"
      :data-primitives-date-picker-trigger="''"
      @click="onClick"
    >
      <slot />
    </Primitive>
  </component>
</template>
