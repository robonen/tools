<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A single `role="gridcell"` day container (`<td>`). Reflects the date's state
 * (selected, disabled, unavailable, outside-view, today) as `data-*`
 * attributes and `aria-*` for styling, and wraps the focusable
 * `CalendarCellTrigger`.
 */
export interface CalendarCellProps extends PrimitiveProps {
  /** The date this cell represents. */
  date: Date;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useCalendarGridContext, useCalendarRootContext } from './context';
import { isSameDay, isSameMonth } from './utils';

const { as = 'td', date } = defineProps<CalendarCellProps>();

const ctx = useCalendarRootContext();
const gridCtx = useCalendarGridContext();

const isSelected = computed(() => ctx.isDateSelected(date));
const isDisabled = computed(() => ctx.isDateDisabled(date));
const isUnavailable = computed(() => ctx.isDateUnavailable(date));
const isOutsideView = computed(() => !isSameMonth(date, gridCtx.month.value));
const isToday = computed(() => isSameDay(date, new Date()));
</script>

<template>
  <Primitive
    :as="as"
    role="gridcell"
    :aria-selected="isSelected ? true : undefined"
    :aria-disabled="(isDisabled || isUnavailable) ? true : undefined"
    :data-primitives-calendar-cell="''"
    :data-selected="isSelected ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :data-unavailable="isUnavailable ? '' : undefined"
    :data-outside-view="isOutsideView ? '' : undefined"
    :data-today="isToday ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
