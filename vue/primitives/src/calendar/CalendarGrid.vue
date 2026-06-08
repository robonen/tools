<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CalendarGridProps extends PrimitiveProps {
  /** The month this grid represents. Defaults to the root placeholder's month. */
  month?: Date;
}
</script>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { Primitive } from '../primitive';
import { provideCalendarGridContext, useCalendarRootContext } from './context';

const { as = 'table', month } = defineProps<CalendarGridProps>();

const ctx = useCalendarRootContext();
const monthRef = toRef(() => month ?? ctx.placeholder.value);

provideCalendarGridContext({ month: monthRef });

const readonly = computed(() => ctx.readonly.value || undefined);
const disabled = computed(() => ctx.disabled.value || undefined);
</script>

<template>
  <Primitive
    :as="as"
    role="grid"
    tabindex="-1"
    :aria-label="ctx.fullCalendarLabel.value"
    :aria-readonly="readonly ? true : undefined"
    :aria-disabled="disabled ? true : undefined"
    :data-primitives-calendar-grid="''"
    :data-readonly="readonly ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
