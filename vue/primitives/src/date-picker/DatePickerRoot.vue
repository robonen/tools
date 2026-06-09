<script lang="ts">
import type { CalendarMonth, CalendarRootProps, WeekDayFormat } from '../calendar';
import type { PrimitiveProps } from '../primitive';

/**
 * A single-date picker that pairs a popover-anchored calendar with an optional
 * trigger, field, and hidden form input. Owns the selected date, placeholder
 * month, and open state, and provides both date-picker and calendar context to
 * its parts. Use it when you need a compact, accessible "pick one date" control
 * (e.g. a form field) rather than an always-visible `Calendar`.
 */
export interface DatePickerRootProps extends PrimitiveProps,
  Omit<CalendarRootProps, 'as' | 'asChild'> {
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Modal popover (traps focus + blocks outside pointer). @default false */
  modal?: boolean;
  /** Hidden form input name for submission. */
  name?: string;
  /** Format used to serialize the hidden input value. @default 'iso' */
  valueFormat?: 'iso' | ((d: Date) => string);
  /** Close popover on selection. @default true */
  closeOnSelect?: boolean;
}

export interface DatePickerRootEmits {
  'update:modelValue': [date: Date | undefined];
  'update:placeholder': [date: Date];
  'update:open': [open: boolean];
}
</script>

<script setup lang="ts">
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { computed, onMounted, ref, toRef, watch } from 'vue';
import {
  addMonths,
  addYears,
  clamp,
  createMonths,
  formatMonthYear,
  getWeekdayLabels,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isDateUnavailable as isUnavailable,
  provideCalendarRootContext,
  toDateOnly,
} from '../calendar';
import { useId } from '../config-provider';
import { PopperRoot } from '../popper';
import { Primitive } from '../primitive';
import { provideDatePickerRootContext } from './context';

defineOptions({ inheritAttrs: false });

const {
  as = 'div',
  defaultOpen = false,
  modal = false,
  name,
  valueFormat = 'iso',
  closeOnSelect = true,
  defaultValue,
  defaultPlaceholder,
  minValue,
  maxValue,
  isDateUnavailable: propsIsDateUnavailable,
  isDateDisabled: propsIsDateDisabled,
  pagedNavigation = false,
  weekStartsOn = 0,
  weekdayFormat = 'short',
  fixedWeeks = true,
  numberOfMonths = 1,
  disabled = false,
  readonly = false,
  initialFocus = false,
  locale = 'en',
  dir = 'ltr',
  nextPage: propsNextPage,
  prevPage: propsPrevPage,
  calendarLabel = 'Calendar',
} = defineProps<DatePickerRootProps>();

defineEmits<DatePickerRootEmits>();

const { forwardRef, currentElement: parentElement } = useForwardExpose();

const localOpen = ref<boolean>(defaultOpen);
const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

const localValue = ref<Date | undefined>(defaultValue);
const modelValue = defineModel<Date | undefined>('modelValue', {
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const localPlaceholder = ref<Date>(
  toDateOnly(defaultPlaceholder ?? modelValue.value ?? new Date()),
);
const placeholder = defineModel<Date>('placeholder', {
  default: undefined,
  get: v => v ?? localPlaceholder.value,
  set: (v) => {
    localPlaceholder.value = toDateOnly(v);
    return localPlaceholder.value;
  },
});

const triggerId = useId(undefined, 'date-picker-trigger');
const contentId = useId(undefined, 'date-picker-content');
const triggerElement = ref<HTMLElement>();
const hasCustomAnchor = ref(false);
const focusedDate = ref<Date | undefined>();

const localeRef = toRef(() => locale);
const dirRef = toRef(() => dir);
const modalRef = toRef(() => modal);
const nameRef = toRef(() => name);
const weekStartsOnRef = toRef(() => weekStartsOn);
const weekdayFormatRef = toRef(() => weekdayFormat as WeekDayFormat);
const fixedWeeksRef = toRef(() => fixedWeeks);
const numberOfMonthsRef = toRef(() => numberOfMonths);
const disabledRef = toRef(() => disabled);
const readonlyRef = toRef(() => readonly);
const pagedNavigationRef = toRef(() => pagedNavigation);
const minValueRef = toRef(() => minValue);
const maxValueRef = toRef(() => maxValue);

const grid = computed<CalendarMonth[]>(() => createMonths({
  date: placeholder.value,
  numberOfMonths,
  weekStartsOn,
}));

const weekDays = computed(() => getWeekdayLabels(weekStartsOn, locale, weekdayFormat));

const headingValue = computed(() => {
  const months = grid.value;
  if (!months.length) return '';
  if (months.length === 1) return formatMonthYear(months[0]!.value, locale);
  const first = formatMonthYear(months[0]!.value, locale);
  const last = formatMonthYear(months[months.length - 1]!.value, locale);
  return `${first} - ${last}`;
});

const fullCalendarLabel = computed(() => `${calendarLabel}, ${headingValue.value}`);

function isDateDisabled(date: Date): boolean {
  if (disabled) return true;
  if (propsIsDateDisabled?.(date)) return true;
  if (minValue && isBefore(date, minValue)) return true;
  if (maxValue && isAfter(date, maxValue)) return true;
  return false;
}

function isDateUnavailableLocal(date: Date): boolean {
  return isUnavailable(date, propsIsDateUnavailable, minValue, maxValue);
}

function isDateSelected(date: Date): boolean {
  return modelValue.value ? isSameDay(modelValue.value, date) : false;
}

function isOutsideVisibleView(date: Date): boolean {
  return !grid.value.some(m => isSameMonth(m.value, date));
}

const isInvalid = computed(() => {
  if (!modelValue.value) return false;
  return isDateDisabled(modelValue.value) || isDateUnavailableLocal(modelValue.value);
});

function setDate(date: Date | undefined) {
  if (readonly) return;
  if (date && (isDateDisabled(date) || isDateUnavailableLocal(date))) return;
  modelValue.value = date ? toDateOnly(date) : undefined;
  if (date && closeOnSelect) open.value = false;
}

function setPlaceholder(date: Date) {
  placeholder.value = clamp(date, minValue, maxValue);
}

function pageStep(): number {
  return pagedNavigation ? numberOfMonths : 1;
}
function nextPage(fn?: (placeholder: Date) => Date) {
  const fnToUse = fn ?? propsNextPage;
  placeholder.value = fnToUse
    ? toDateOnly(fnToUse(placeholder.value))
    : addMonths(placeholder.value, pageStep());
}
function prevPage(fn?: (placeholder: Date) => Date) {
  const fnToUse = fn ?? propsPrevPage;
  placeholder.value = fnToUse
    ? toDateOnly(fnToUse(placeholder.value))
    : addMonths(placeholder.value, -pageStep());
}
function nextYear() {
  placeholder.value = addYears(placeholder.value, 1);
}
function prevYear() {
  placeholder.value = addYears(placeholder.value, -1);
}

function isNextButtonDisabled(fn?: (placeholder: Date) => Date): boolean {
  if (disabled) return true;
  if (!maxValue) return false;
  const lastMonth = grid.value[grid.value.length - 1]?.value;
  if (!lastMonth) return false;
  const fnToUse = fn ?? propsNextPage;
  const probe = fnToUse
    ? toDateOnly(fnToUse(placeholder.value))
    : addMonths(lastMonth, 1);
  return isAfter(probe, maxValue);
}
function isPrevButtonDisabled(fn?: (placeholder: Date) => Date): boolean {
  if (disabled) return true;
  if (!minValue) return false;
  const firstMonth = grid.value[0]?.value;
  if (!firstMonth) return false;
  const fnToUse = fn ?? propsPrevPage;
  const probe = fnToUse
    ? toDateOnly(fnToUse(placeholder.value))
    : addMonths(firstMonth, -1);
  return isBefore(probe, minValue);
}

watch(modelValue, (v) => {
  if (v && !isSameMonth(v, placeholder.value))
    placeholder.value = toDateOnly(v);
});

onMounted(() => {
  if (!initialFocus || !open.value || !parentElement.value) return;
  const target = parentElement.value.querySelector<HTMLElement>(
    '[data-primitives-calendar-cell-trigger][data-selected]'
    + ',[data-primitives-calendar-cell-trigger][data-today]'
    + ',[data-primitives-calendar-cell-trigger]:not([data-outside-view]):not([data-disabled])',
  );
  target?.focus();
});

useEventListener(parentElement, 'focusout', (e) => {
  if (!parentElement.value?.contains(e.relatedTarget as Node | null))
    focusedDate.value = undefined;
});

const hiddenValue = computed(() => {
  if (!modelValue.value) return '';
  if (typeof valueFormat === 'function') return valueFormat(modelValue.value);
  return modelValue.value.toISOString().slice(0, 10);
});

provideDatePickerRootContext({
  open,
  modal: modalRef,
  name: nameRef,
  modelValue,
  locale: localeRef,
  triggerId,
  contentId,
  triggerElement,
  hasCustomAnchor,
  onOpenChange: (v) => { open.value = v; },
  onOpenToggle: () => { open.value = !open.value; },
});

provideCalendarRootContext({
  modelValue,
  placeholder,
  locale: localeRef,
  dir: dirRef,
  grid,
  weekDays,
  headingValue,
  fullCalendarLabel,
  weekStartsOn: weekStartsOnRef,
  weekdayFormat: weekdayFormatRef,
  fixedWeeks: fixedWeeksRef,
  numberOfMonths: numberOfMonthsRef,
  disabled: disabledRef,
  readonly: readonlyRef,
  pagedNavigation: pagedNavigationRef,
  minValue: minValueRef,
  maxValue: maxValueRef,
  isDateDisabled,
  isDateUnavailable: isDateUnavailableLocal,
  isDateSelected,
  isOutsideVisibleView,
  isInvalid,
  parentElement,
  focusedDate,
  setDate,
  setPlaceholder,
  nextPage,
  prevPage,
  nextYear,
  prevYear,
  isNextButtonDisabled,
  isPrevButtonDisabled,
});
</script>

<template>
  <PopperRoot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-primitives-date-picker-root="''"
      :data-state="open ? 'open' : 'closed'"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :open="open" :model-value="modelValue" />
      <input
        v-if="name"
        type="hidden"
        :name="name"
        :value="hiddenValue"
        :disabled="disabled"
        aria-hidden="true"
        tabindex="-1"
        style="display: none"
      >
    </Primitive>
  </PopperRoot>
</template>
