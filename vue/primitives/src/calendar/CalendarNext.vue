<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CalendarNextProps extends PrimitiveProps {
  /** Override the root's `nextPage` for just this button. */
  nextPage?: (placeholder: Date) => Date;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useCalendarRootContext } from './context';

const { as = 'button', nextPage: nextPageProp } = defineProps<CalendarNextProps>();

defineSlots<{
  default?: (props: { disabled: boolean }) => unknown;
}>();

const ctx = useCalendarRootContext();
const disabled = computed(() => ctx.disabled.value || ctx.isNextButtonDisabled(nextPageProp));

function handleClick() {
  if (disabled.value) return;
  ctx.nextPage(nextPageProp);
}
</script>

<template>
  <Primitive
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    aria-label="Next"
    :aria-disabled="disabled || undefined"
    :data-primitives-calendar-next="''"
    :data-disabled="disabled ? '' : undefined"
    :disabled="as === 'button' ? disabled : undefined"
    @click="handleClick"
  >
    <slot :disabled="disabled">
      Next
    </slot>
  </Primitive>
</template>
