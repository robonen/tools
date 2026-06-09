<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The focusable, clickable day button inside a `CalendarCell`. Selects its
 * `day` on click/Enter/Space, drives roving focus and full arrow-key /
 * Home-End / PageUp-Down keyboard navigation (paging the month when focus
 * crosses the visible range), and exposes day state through its slot.
 */
export interface CalendarCellTriggerProps extends PrimitiveProps {
  /** The day this trigger represents. */
  day: Date;
  /** The month this trigger's cell belongs to. Defaults to grid context. */
  month?: Date;
}

export interface CalendarCellTriggerSlotProps {
  dayValue: string;
  disabled: boolean;
  selected: boolean;
  today: boolean;
  outsideView: boolean;
  unavailable: boolean;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { computed, nextTick } from 'vue';
import { Primitive } from '../primitive';
import { useCalendarGridContext, useCalendarRootContext } from './context';
import { addDays, addMonths, addYears, formatFullDate, isSameDay, isSameMonth } from './utils';

const { as = 'div', day, month } = defineProps<CalendarCellTriggerProps>();

defineSlots<{
  default?: (props: CalendarCellTriggerSlotProps) => unknown;
}>();

const ctx = useCalendarRootContext();
const gridCtx = useCalendarGridContext();
const { forwardRef, currentElement } = useForwardExpose();

const monthValue = computed(() => month ?? gridCtx.month.value);

const isOutsideView = computed(() => !isSameMonth(day, monthValue.value));
const isDisabled = computed(() => ctx.isDateDisabled(day));
const isUnavailable = computed(() => ctx.isDateUnavailable(day));
const isSelected = computed(() => ctx.isDateSelected(day));
const isToday = computed(() => isSameDay(day, new Date()));

const dayValue = computed(() => day.getDate().toLocaleString(ctx.locale.value));
const labelText = computed(() => formatFullDate(day, ctx.locale.value));

const isFocusedDate = computed(() => {
  if (isOutsideView.value || isDisabled.value) return false;
  if (ctx.focusedDate.value) return isSameDay(day, ctx.focusedDate.value);
  // Fallback focusable: selected, else today (if in view), else first day of month.
  if (ctx.modelValue.value && isSameMonth(ctx.modelValue.value, monthValue.value))
    return isSameDay(day, ctx.modelValue.value);
  const today = new Date();
  if (isSameMonth(today, monthValue.value))
    return isSameDay(day, today);
  return day.getDate() === 1 && isSameMonth(day, monthValue.value);
});

function selectIfAllowed() {
  if (ctx.readonly.value) return;
  if (isDisabled.value || isUnavailable.value) return;
  ctx.setDate(day);
  ctx.focusedDate.value = day;
}

function handleClick() {
  selectIfAllowed();
}

function focusByDataValue(target: Date) {
  const parent = ctx.parentElement.value;
  if (!parent) return false;
  const el = parent.querySelector<HTMLElement>(
    `[data-primitives-calendar-cell-trigger][data-value="${target.toISOString().slice(0, 10)}"]:not([data-outside-view])`,
  );
  if (el) {
    el.focus();
    return true;
  }
  return false;
}

function shiftFocus(target: Date) {
  if (ctx.minValue.value && target < ctx.minValue.value) return;
  if (ctx.maxValue.value && target > ctx.maxValue.value) return;
  ctx.focusedDate.value = target;
  if (focusByDataValue(target)) return;
  // Crossed visible range — page placeholder and retry.
  if (target > ctx.placeholder.value) {
    if (ctx.isNextButtonDisabled()) return;
    ctx.nextPage();
  }
  else {
    if (ctx.isPrevButtonDisabled()) return;
    ctx.prevPage();
  }
  nextTick(() => focusByDataValue(target));
}

function handleKeyDown(e: KeyboardEvent) {
  if (isDisabled.value) return;
  const rtl = ctx.dir.value === 'rtl' ? -1 : 1;
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      shiftFocus(addDays(day, rtl));
      break;
    case 'ArrowLeft':
      e.preventDefault();
      shiftFocus(addDays(day, -rtl));
      break;
    case 'ArrowUp':
      e.preventDefault();
      shiftFocus(addDays(day, -7));
      break;
    case 'ArrowDown':
      e.preventDefault();
      shiftFocus(addDays(day, 7));
      break;
    case 'Home': {
      e.preventDefault();
      const dow = day.getDay();
      const offset = (dow - ctx.weekStartsOn.value + 7) % 7;
      shiftFocus(addDays(day, -offset));
      break;
    }
    case 'End': {
      e.preventDefault();
      const dow = day.getDay();
      const offset = (dow - ctx.weekStartsOn.value + 7) % 7;
      shiftFocus(addDays(day, 6 - offset));
      break;
    }
    case 'PageUp':
      e.preventDefault();
      shiftFocus(e.shiftKey ? addYears(day, -1) : addMonths(day, -1));
      break;
    case 'PageDown':
      e.preventDefault();
      shiftFocus(e.shiftKey ? addYears(day, 1) : addMonths(day, 1));
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      selectIfAllowed();
      break;
  }
}

function handleFocus() {
  ctx.focusedDate.value = day;
}

const dataValue = computed(() => day.toISOString().slice(0, 10));
const tabindex = computed(() => {
  if (isFocusedDate.value) return 0;
  if (isOutsideView.value || isDisabled.value) return undefined;
  return -1;
});

defineExpose({ currentElement });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="button"
    :aria-label="labelText"
    :aria-disabled="(isDisabled || isUnavailable) ? true : undefined"
    :aria-selected="isSelected ? true : undefined"
    :tabindex="tabindex"
    :data-primitives-calendar-cell-trigger="''"
    :data-value="dataValue"
    :data-selected="isSelected ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :data-unavailable="isUnavailable ? '' : undefined"
    :data-outside-view="isOutsideView ? '' : undefined"
    :data-today="isToday ? '' : undefined"
    :data-focused="isFocusedDate ? '' : undefined"
    @click="handleClick"
    @focus="handleFocus"
    @keydown="handleKeyDown"
  >
    <slot
      :day-value="dayValue"
      :disabled="isDisabled"
      :selected="isSelected"
      :today="isToday"
      :outside-view="isOutsideView"
      :unavailable="isUnavailable"
    >
      {{ dayValue }}
    </slot>
  </Primitive>
</template>
