<script lang="ts">
import type { CalendarMonth, CalendarRootProps, WeekDayFormat } from '../calendar';
import type { PrimitiveProps } from '../../internal/primitive';
import type { Granularity, HourCycle } from './use-date-field';

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
  /** Id forwarded to the focusable form control / first segment. */
  id?: string;
  /** Marks the form control as required for native constraint validation. @default false */
  required?: boolean;
  /** Format used to serialize the hidden input value. @default 'iso' */
  valueFormat?: 'iso' | ((d: Date) => string);
  /** Close popover on selection. @default true */
  closeOnSelect?: boolean;
  /**
   * Keep the current value selected when the already-selected date is picked
   * again (otherwise re-selecting clears it). @default false
   */
  preventDeselect?: boolean;
  /**
   * Smallest unit the field edits. `'day'` is date-only; `'hour'`/`'minute'`/
   * `'second'` add time segments and preserve the time-of-day. @default 'day'
   */
  granularity?: Granularity;
  /** Hour cycle for the time segments (12 or 24). Inferred from locale if omitted. */
  hourCycle?: HourCycle;
}

export interface DatePickerRootEmits {
  'update:modelValue': [date: Date | undefined];
  'update:placeholder': [date: Date];
  'update:open': [open: boolean];
}
</script>

<script setup lang="ts">
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { computed, onMounted, ref, shallowRef, toRef, watch } from 'vue';
import { provideCalendarRootContext } from '../calendar';
import { useDateAdapter, useId } from '../../utilities/config-provider';
import { PopperRoot } from '../../overlays/popper';
import { Primitive } from '../../internal/primitive';
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { provideDatePickerRootContext } from './context';
import { hasTimeGranularity } from './use-date-field';

defineOptions({ inheritAttrs: false });

const {
  as = 'div',
  defaultOpen = false,
  modal = false,
  name,
  id,
  required = false,
  valueFormat = 'iso',
  closeOnSelect = true,
  preventDeselect = false,
  granularity: propsGranularity = 'day',
  hourCycle: propsHourCycle,
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
  disableDaysOutsideCurrentView = false,
  disabled = false,
  readonly = false,
  initialFocus = false,
  locale = 'en',
  dir = 'ltr',
  nextPage: propsNextPage,
  prevPage: propsPrevPage,
  calendarLabel = 'Calendar',
  dateAdapter,
} = defineProps<DatePickerRootProps>();

defineEmits<DatePickerRootEmits>();

const { forwardRef, currentElement: parentElement } = useForwardExpose();

// Resolve the effective date backend: per-instance prop wins over the global
// `ConfigProvider` adapter, falling back to the native `Date` adapter.
const adapter = useDateAdapter(() => dateAdapter);

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
  adapter.value.toDateOnly(defaultPlaceholder ?? modelValue.value ?? adapter.value.now()),
);
const placeholder = defineModel<Date>('placeholder', {
  default: undefined,
  get: v => v ?? localPlaceholder.value,
  set: (v) => {
    localPlaceholder.value = adapter.value.toDateOnly(v);
    return localPlaceholder.value;
  },
});

const triggerId = useId(undefined, 'date-picker-trigger');
const contentId = useId(undefined, 'date-picker-content');
const generatedFieldId = useId(undefined, 'date-picker-field');
const fieldId = computed(() => id ?? generatedFieldId.value);
const triggerElement = shallowRef<HTMLElement>();
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
const requiredRef = toRef(() => required);
const granularityRef = computed<Granularity>(() => propsGranularity);
const hourCycleRef = toRef(() => propsHourCycle);
const preventDeselectRef = toRef(() => preventDeselect);
const multipleRef = toRef(() => false);
const disableDaysOutsideCurrentViewRef = toRef(() => disableDaysOutsideCurrentView);

/** Strip time for `day` granularity; preserve full time-of-day otherwise. */
function normalizeValue(date: Date): Date {
  return hasTimeGranularity(propsGranularity)
    ? adapter.value.clone(date)
    : adapter.value.toDateOnly(date);
}

const grid = computed<CalendarMonth[]>(() => adapter.value.createMonths({
  date: placeholder.value,
  numberOfMonths,
  weekStartsOn,
}));

const weekDays = computed(() => adapter.value.getWeekdayLabels(weekStartsOn, locale, weekdayFormat));

const headingValue = computed(() => {
  const months = grid.value;
  if (!months.length) return '';
  if (months.length === 1) return adapter.value.formatMonthYear(months[0]!.value, locale);
  const first = adapter.value.formatMonthYear(months[0]!.value, locale);
  const last = adapter.value.formatMonthYear(months[months.length - 1]!.value, locale);
  return `${first} - ${last}`;
});

const fullCalendarLabel = computed(() => `${calendarLabel}, ${headingValue.value}`);

function isDateDisabled(date: Date): boolean {
  if (disabled) return true;
  if (propsIsDateDisabled?.(date)) return true;
  if (minValue && adapter.value.isBefore(date, minValue)) return true;
  if (maxValue && adapter.value.isAfter(date, maxValue)) return true;
  return false;
}

function isDateUnavailableLocal(date: Date): boolean {
  return adapter.value.isDateUnavailable(date, propsIsDateUnavailable, minValue, maxValue);
}

function isDateSelected(date: Date): boolean {
  return modelValue.value ? adapter.value.isSameDay(modelValue.value, date) : false;
}

const hasSelectedDate = computed(() => modelValue.value !== undefined);
const firstFocusableDate = computed(() =>
  adapter.value.findFirstFocusableDate(grid.value, isDateDisabled, isDateUnavailableLocal),
);

function isOutsideVisibleView(date: Date): boolean {
  return !grid.value.some(m => adapter.value.isSameMonth(m.value, date));
}

const isInvalid = computed(() => {
  if (!modelValue.value) return false;
  return isDateDisabled(modelValue.value) || isDateUnavailableLocal(modelValue.value);
});

/**
 * Unified commit path for any selection source. Honors readonly/disabled,
 * disabled-date guards, and `preventDeselect` toggle-off. When `keepTime` is set
 * (calendar day pick under a time granularity) the existing time-of-day is
 * carried onto the picked day; the segmented field passes a full datetime and
 * commits it verbatim.
 */
function onDateChange(date: Date | undefined, options?: { keepTime?: boolean }) {
  if (readonly || disabled) return;
  if (!date) {
    modelValue.value = undefined;
    return;
  }
  if (isDateDisabled(date) || isDateUnavailableLocal(date)) return;

  let next = date;
  if (options?.keepTime && hasTimeGranularity(propsGranularity) && modelValue.value) {
    const day = adapter.value.getParts(date);
    const time = adapter.value.getParts(modelValue.value);
    next = adapter.value.fromParts({
      year: day.year,
      month: day.month,
      day: day.day,
      hour: time.hour,
      minute: time.minute,
      second: time.second,
    });
  }
  else if (!hasTimeGranularity(propsGranularity)) {
    next = normalizeValue(next);
  }

  if (!preventDeselect && modelValue.value
    && adapter.value.compare(modelValue.value, next) === 0) {
    modelValue.value = undefined;
    return;
  }

  modelValue.value = next;
  if (closeOnSelect) open.value = false;
}

function setDate(date: Date | undefined) {
  onDateChange(date, { keepTime: true });
}

function onPlaceholderChange(date: Date) {
  placeholder.value = date;
}

function setPlaceholder(date: Date) {
  placeholder.value = adapter.value.clamp(date, minValue, maxValue);
}

function pageStep(): number {
  return pagedNavigation ? numberOfMonths : 1;
}
function nextPage(fn?: (placeholder: Date) => Date) {
  const fnToUse = fn ?? propsNextPage;
  placeholder.value = fnToUse
    ? adapter.value.toDateOnly(fnToUse(placeholder.value))
    : adapter.value.addMonths(placeholder.value, pageStep());
}
function prevPage(fn?: (placeholder: Date) => Date) {
  const fnToUse = fn ?? propsPrevPage;
  placeholder.value = fnToUse
    ? adapter.value.toDateOnly(fnToUse(placeholder.value))
    : adapter.value.addMonths(placeholder.value, -pageStep());
}
function nextYear() {
  placeholder.value = adapter.value.addYears(placeholder.value, 1);
}
function prevYear() {
  placeholder.value = adapter.value.addYears(placeholder.value, -1);
}

function isNextButtonDisabled(fn?: (placeholder: Date) => Date): boolean {
  if (disabled) return true;
  if (!maxValue) return false;
  const lastMonth = grid.value[grid.value.length - 1]?.value;
  if (!lastMonth) return false;
  const fnToUse = fn ?? propsNextPage;
  const probe = fnToUse
    ? adapter.value.toDateOnly(fnToUse(placeholder.value))
    : adapter.value.addMonths(lastMonth, 1);
  return adapter.value.isAfter(probe, maxValue);
}
function isPrevButtonDisabled(fn?: (placeholder: Date) => Date): boolean {
  if (disabled) return true;
  if (!minValue) return false;
  const firstMonth = grid.value[0]?.value;
  if (!firstMonth) return false;
  const fnToUse = fn ?? propsPrevPage;
  const probe = fnToUse
    ? adapter.value.toDateOnly(fnToUse(placeholder.value))
    : adapter.value.addMonths(firstMonth, -1);
  return adapter.value.isBefore(probe, minValue);
}

watch(modelValue, (v) => {
  if (v && !adapter.value.isSameMonth(v, placeholder.value))
    placeholder.value = adapter.value.toDateOnly(v);
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
  return adapter.value.toISO(modelValue.value).slice(0, 10);
});

const hasTime = computed(() => hasTimeGranularity(propsGranularity));
const nativeInputType = computed(() => hasTime.value ? 'datetime-local' : 'date');

/** Local (not UTC) value string for the native validation input. */
function toNativeInputValue(d: Date | undefined): string {
  if (!d) return '';
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const p = adapter.value.getParts(d);
  const date = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  if (!hasTime.value) return date;
  const time = propsGranularity === 'second'
    ? `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
    : `${pad(p.hour)}:${pad(p.minute)}`;
  return `${date}T${time}`;
}

const nativeValue = computed(() => toNativeInputValue(modelValue.value));
const nativeMin = computed(() => minValue ? toNativeInputValue(minValue) : undefined);
const nativeMax = computed(() => maxValue ? toNativeInputValue(maxValue) : undefined);

function focusFirstSegment() {
  if (disabled || readonly) return;
  const first = parentElement.value?.querySelector<HTMLElement>('[data-primitives-date-picker-segment]:not([data-readonly])');
  first?.focus();
}

provideDatePickerRootContext({
  dateAdapter: adapter,
  open,
  modal: modalRef,
  name: nameRef,
  modelValue,
  placeholder,
  locale: localeRef,
  dir: dirRef,
  disabled: disabledRef,
  readonly: readonlyRef,
  required: requiredRef,
  isInvalid,
  granularity: granularityRef,
  hourCycle: hourCycleRef,
  minValue: minValueRef,
  maxValue: maxValueRef,
  triggerId,
  contentId,
  fieldId,
  triggerElement,
  hasCustomAnchor,
  onDateChange,
  onPlaceholderChange,
  onOpenChange: (v) => { open.value = v; },
  onOpenToggle: () => { open.value = !open.value; },
});

provideCalendarRootContext({
  dateAdapter: adapter,
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
  multiple: multipleRef,
  preventDeselect: preventDeselectRef,
  disableDaysOutsideCurrentView: disableDaysOutsideCurrentViewRef,
  minValue: minValueRef,
  maxValue: maxValueRef,
  isDateDisabled,
  isDateUnavailable: isDateUnavailableLocal,
  isDateSelected,
  isOutsideVisibleView,
  isInvalid,
  hasSelectedDate,
  firstFocusableDate,
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
      <VisuallyHidden
        v-if="required || minValue || maxValue"
        :id="fieldId"
        as="input"
        feature="focusable"
        tabindex="-1"
        :type="nativeInputType"
        :value="nativeValue"
        :required="required"
        :min="nativeMin"
        :max="nativeMax"
        :disabled="disabled"
        @focus="focusFirstSegment"
      />
    </Primitive>
  </PopperRoot>
</template>
