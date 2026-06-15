<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

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
import { Primitive } from '../../internal/primitive';
import { useCalendarGridContext, useCalendarRootContext } from './context';

const { as = 'td', date } = defineProps<CalendarCellProps>();

const ctx = useCalendarRootContext();
const gridCtx = useCalendarGridContext();
const adapter = ctx.dateAdapter;

const isSelected = computed(() => ctx.isDateSelected(date));
const isOutsideView = computed(() => !adapter.value.isSameMonth(date, gridCtx.month.value));
const isDisabled = computed(() =>
  ctx.isDateDisabled(date)
  || (ctx.disableDaysOutsideCurrentView.value && isOutsideView.value),
);
const isUnavailable = computed(() => ctx.isDateUnavailable(date));
const isOutsideVisibleView = computed(() => ctx.isOutsideVisibleView(date));
const isToday = computed(() => adapter.value.isSameDay(date, adapter.value.now()));
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
    :data-outside-visible-view="isOutsideVisibleView ? '' : undefined"
    :data-today="isToday ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
