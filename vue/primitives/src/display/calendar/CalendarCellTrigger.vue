<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

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
  outsideVisibleView: boolean;
  unavailable: boolean;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { computed, nextTick } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCalendarGridContext, useCalendarRootContext } from './context';

/**
 * Cache of `Intl.NumberFormat` instances keyed by locale. `Number#toLocaleString`
 * with an explicit locale internally constructs a fresh `Intl.NumberFormat` on
 * every call; this trigger renders ~42 day cells per month, so caching one
 * immutable formatter per locale at module scope removes that per-cell
 * allocation while preserving locale-specific numbering systems.
 */
const dayNumberFormatCache = new Map<string, Intl.NumberFormat>();

function formatDayNumber(day: number, locale: string): string {
  let fmt = dayNumberFormatCache.get(locale);
  if (fmt === undefined) {
    fmt = new Intl.NumberFormat(locale);
    dayNumberFormatCache.set(locale, fmt);
  }
  return fmt.format(day);
}

const { as = 'div', day, month } = defineProps<CalendarCellTriggerProps>();

defineSlots<{
  default?: (props: CalendarCellTriggerSlotProps) => unknown;
}>();

const ctx = useCalendarRootContext();
const gridCtx = useCalendarGridContext();
const { forwardRef } = useForwardExpose();
const adapter = ctx.dateAdapter;

const monthValue = computed(() => month ?? gridCtx.month.value);

const isOutsideView = computed(() => !adapter.value.isSameMonth(day, monthValue.value));
const isOutsideVisibleView = computed(() => ctx.isOutsideVisibleView(day));
const isDisabled = computed(() =>
  ctx.isDateDisabled(day)
  || (ctx.disableDaysOutsideCurrentView.value && isOutsideView.value),
);
const isUnavailable = computed(() => ctx.isDateUnavailable(day));
const isSelected = computed(() => ctx.isDateSelected(day));
const isToday = computed(() => adapter.value.isSameDay(day, adapter.value.now()));

const dayValue = computed(() => formatDayNumber(adapter.value.getParts(day).day, ctx.locale.value));
const labelText = computed(() => adapter.value.formatFullDate(day, ctx.locale.value));

function selectionInView(): Date | undefined {
  const v = ctx.modelValue.value;
  if (Array.isArray(v))
    return v.find(d => adapter.value.isSameMonth(d, monthValue.value));
  return v && adapter.value.isSameMonth(v, monthValue.value) ? v : undefined;
}

const isFocusedDate = computed(() => {
  if (isOutsideView.value || isDisabled.value) return false;
  if (ctx.focusedDate.value) return adapter.value.isSameDay(day, ctx.focusedDate.value);
  // Fallback focusable: selected (in view), else today (if in view), else the
  // first actionable (non-disabled) date — never an unfocusable cell.
  const selected = selectionInView();
  if (selected) return adapter.value.isSameDay(day, selected);
  const today = adapter.value.now();
  if (adapter.value.isSameMonth(today, monthValue.value) && !ctx.isDateDisabled(today) && !ctx.isDateUnavailable(today))
    return adapter.value.isSameDay(day, today);
  const first = ctx.firstFocusableDate.value;
  return first ? adapter.value.isSameDay(day, first) : false;
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

function cellFor(target: Date): HTMLElement | null {
  const parent = ctx.parentElement.value;
  if (!parent) return null;
  return parent.querySelector<HTMLElement>(
    `[data-primitives-calendar-cell-trigger][data-value="${adapter.value.toIsoDate(target)}"]:not([data-outside-view])`,
  );
}

/**
 * Move focus to `target`. When `step` is provided (arrow navigation) and the
 * resolved cell is disabled, keep stepping in the same direction so focus
 * never parks on a disabled day. Home/End/Page jumps pass no step and land
 * directly on the target.
 */
function shiftFocus(target: Date, step?: number) {
  if (ctx.minValue.value && adapter.value.isBefore(target, ctx.minValue.value)) return;
  if (ctx.maxValue.value && adapter.value.isAfter(target, ctx.maxValue.value)) return;

  const inViewCell = cellFor(target);
  if (inViewCell) {
    if (step && inViewCell.hasAttribute('data-disabled')) {
      shiftFocus(adapter.value.addDays(target, step), step);
      return;
    }
    ctx.focusedDate.value = target;
    // Keep the placeholder in sync with the focused day, but only while it
    // stays within the placeholder's own month — `grid` derives its visible
    // window from the placeholder, so a cross-month write would shift a
    // multi-month view. Cross-view moves are handled by the paging branch.
    if (adapter.value.isSameMonth(target, ctx.placeholder.value))
      ctx.setPlaceholder(target);
    inViewCell.focus();
    return;
  }

  // Crossed visible range — page placeholder and retry.
  ctx.focusedDate.value = target;
  if (target > ctx.placeholder.value) {
    if (ctx.isNextButtonDisabled()) return;
    ctx.nextPage();
  }
  else {
    if (ctx.isPrevButtonDisabled()) return;
    ctx.prevPage();
  }
  nextTick(() => {
    const el = cellFor(target);
    if (!el) return;
    if (step && el.hasAttribute('data-disabled')) {
      shiftFocus(adapter.value.addDays(target, step), step);
      return;
    }
    el.focus();
  });
}

function handleKeyDown(e: KeyboardEvent) {
  if (isDisabled.value) return;
  const rtl = ctx.dir.value === 'rtl' ? -1 : 1;
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      shiftFocus(adapter.value.addDays(day, rtl), rtl);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      shiftFocus(adapter.value.addDays(day, -rtl), -rtl);
      break;
    case 'ArrowUp':
      e.preventDefault();
      shiftFocus(adapter.value.addDays(day, -7), -7);
      break;
    case 'ArrowDown':
      e.preventDefault();
      shiftFocus(adapter.value.addDays(day, 7), 7);
      break;
    case 'Home': {
      e.preventDefault();
      const dow = adapter.value.getDay(day);
      const offset = (dow - ctx.weekStartsOn.value + 7) % 7;
      shiftFocus(adapter.value.addDays(day, -offset));
      break;
    }
    case 'End': {
      e.preventDefault();
      const dow = adapter.value.getDay(day);
      const offset = (dow - ctx.weekStartsOn.value + 7) % 7;
      shiftFocus(adapter.value.addDays(day, 6 - offset));
      break;
    }
    case 'PageUp':
      e.preventDefault();
      shiftFocus(e.shiftKey ? adapter.value.addYears(day, -1) : adapter.value.addMonths(day, -1));
      break;
    case 'PageDown':
      e.preventDefault();
      shiftFocus(e.shiftKey ? adapter.value.addYears(day, 1) : adapter.value.addMonths(day, 1));
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

const dataValue = computed(() => adapter.value.toIsoDate(day));
const tabindex = computed(() => {
  if (isFocusedDate.value) return 0;
  if (isOutsideView.value || isDisabled.value) return undefined;
  return -1;
});
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
    :data-outside-visible-view="isOutsideVisibleView ? '' : undefined"
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
      :outside-visible-view="isOutsideVisibleView"
      :unavailable="isUnavailable"
    >
      {{ dayValue }}
    </slot>
  </Primitive>
</template>
