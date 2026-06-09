<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { CalendarMonth, WeekDayFormat } from './utils';

/**
 * A fully accessible, headless date calendar for picking a single day. The
 * root owns the selected value and the displayed month ("placeholder"), builds
 * the localized month grid(s), and wires up roving keyboard navigation,
 * min/max bounds, and disabled/unavailable predicates. Use it to build an
 * inline date picker or as the body of a popover/`DatePicker`.
 *
 * Compose it with `CalendarHeader` (`CalendarPrev` / `CalendarHeading` /
 * `CalendarNext`) and one `CalendarGrid` per month. Supports `v-model` for the
 * selected date and `v-model:placeholder` for the visible month.
 */
export interface CalendarRootProps extends PrimitiveProps {
  /** Uncontrolled default selected date. */
  defaultValue?: Date;
  /** Uncontrolled default placeholder (displayed month). */
  defaultPlaceholder?: Date;
  /** Minimum selectable date. */
  minValue?: Date;
  /** Maximum selectable date. */
  maxValue?: Date;
  /** Predicate marking a date as unavailable (not selectable). */
  isDateUnavailable?: (date: Date) => boolean;
  /** Predicate marking a date as disabled. */
  isDateDisabled?: (date: Date) => boolean;
  /** Prev/Next navigate by `numberOfMonths` instead of one month. @default false */
  pagedNavigation?: boolean;
  /** First day of week (0=Sun ... 6=Sat). @default 0 */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Width of localized weekday names. @default 'short' */
  weekdayFormat?: WeekDayFormat;
  /** Always render 6 weeks per month. @default true */
  fixedWeeks?: boolean;
  /** Number of months displayed simultaneously. @default 1 */
  numberOfMonths?: number;
  /** Disable the whole calendar. @default false */
  disabled?: boolean;
  /** Make the calendar read-only. @default false */
  readonly?: boolean;
  /** Auto-focus the calendar on mount. @default false */
  initialFocus?: boolean;
  /** Locale for `Intl` formatting. @default 'en' */
  locale?: string;
  /** Reading direction. */
  dir?: 'ltr' | 'rtl';
  /** Override "next page" navigation logic. */
  nextPage?: (placeholder: Date) => Date;
  /** Override "prev page" navigation logic. */
  prevPage?: (placeholder: Date) => Date;
  /** Calendar accessible label prefix. @default 'Calendar' */
  calendarLabel?: string;
}

export interface CalendarRootEmits {
  'update:modelValue': [date: Date | undefined];
  'update:placeholder': [date: Date];
}
</script>

<script setup lang="ts">
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { computed, onMounted, ref, toRef, watch } from 'vue';
import { Primitive } from '../primitive';
import { provideCalendarRootContext } from './context';
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
  toDateOnly,
} from './utils';

defineOptions({ inheritAttrs: false });

const {
  as = 'div',
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
} = defineProps<CalendarRootProps>();

defineEmits<CalendarRootEmits>();

defineSlots<{
  default?: (props: {
    date: Date;
    grid: CalendarMonth[];
    weekDays: string[];
    weekStartsOn: number;
    locale: string;
    modelValue: Date | undefined;
  }) => unknown;
}>();

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

const { forwardRef, currentElement: parentElement } = useForwardExpose();
const focusedDate = ref<Date | undefined>();

const localeRef = toRef(() => locale);
const dirRef = toRef(() => dir);
const weekStartsOnRef = toRef(() => weekStartsOn);
const weekdayFormatRef = toRef(() => weekdayFormat);
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
  if (!initialFocus || !parentElement.value) return;
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
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="application"
    :aria-label="fullCalendarLabel"
    :dir="dir"
    :data-primitives-calendar-root="''"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
  >
    <slot
      :date="placeholder"
      :grid="grid"
      :week-days="weekDays"
      :week-starts-on="weekStartsOn"
      :locale="locale"
      :model-value="modelValue"
    />
  </Primitive>
</template>
