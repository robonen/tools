<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CalendarPrevProps extends PrimitiveProps {
  /** Override the root's `prevPage` for just this button. */
  prevPage?: (placeholder: Date) => Date;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useCalendarRootContext } from './context';

const { as = 'button', prevPage: prevPageProp } = defineProps<CalendarPrevProps>();

defineSlots<{
  default?: (props: { disabled: boolean }) => unknown;
}>();

const ctx = useCalendarRootContext();
const disabled = computed(() => ctx.disabled.value || ctx.isPrevButtonDisabled(prevPageProp));

function handleClick() {
  if (disabled.value) return;
  ctx.prevPage(prevPageProp);
}
</script>

<template>
  <Primitive
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    aria-label="Previous"
    :aria-disabled="disabled || undefined"
    :data-primitives-calendar-prev="''"
    :data-disabled="disabled ? '' : undefined"
    :disabled="as === 'button' ? disabled : undefined"
    @click="handleClick"
  >
    <slot :disabled="disabled">
      Previous
    </slot>
  </Primitive>
</template>
