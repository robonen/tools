<script lang="ts">
import type { DateAdapter } from '../../utilities/config-provider';
import type { PrimitiveProps } from '../../internal/primitive';
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
  /** Uncontrolled default selected date (or dates when `multiple`). */
  defaultValue?: Date | Date[];
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
  /** Allow selecting multiple dates; model becomes a `Date[]`. @default false */
  multiple?: boolean;
  /** Prevent deselecting the last selected date by re-clicking it. @default false */
  preventDeselect?: boolean;
  /** Disable days that belong to adjacent months (outside the current view). @default false */
  disableDaysOutsideCurrentView?: boolean;
  /**
   * Pluggable date backend driving all date math/formatting. Falls back to the
   * app `ConfigProvider` `dateAdapter` (native `Date`) when omitted.
   */
  dateAdapter?: DateAdapter<Date>;
}

export interface CalendarRootEmits {
  'update:modelValue': [date: Date | Date[] | undefined];
  'update:placeholder': [date: Date];
}
</script>

<script setup lang="ts">
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { computed, onMounted, ref, toRef, watch } from 'vue';
import { useDateAdapter } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { provideCalendarRootContext } from './context';

const {
  as = 'div',
  defaultValue,
  defaultPlaceholder,
  minValue,
  maxValue,
  isDateUnavailable: propsIsDateUnavailable,
  isDateDisabled: propsIsDateDisabled,
  pagedNavigation = false,
  weekStartsOn: weekStartsOnProp,
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
  multiple = false,
  preventDeselect = false,
  disableDaysOutsideCurrentView = false,
  dateAdapter,
} = defineProps<CalendarRootProps>();

defineEmits<CalendarRootEmits>();

defineSlots<{
  default?: (props: {
    date: Date;
    grid: CalendarMonth[];
    weekDays: string[];
    weekStartsOn: number;
    locale: string;
    modelValue: Date | Date[] | undefined;
  }) => unknown;
}>();

// Resolve the effective date backend: per-instance prop wins over the global
// `ConfigProvider` adapter, falling back to the native `Date` adapter.
const adapter = useDateAdapter(() => dateAdapter);

const localValue = ref<Date | Date[] | undefined>(defaultValue);
const modelValue = defineModel<Date | Date[] | undefined>('modelValue', {
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

function lastSelected(v: Date | Date[] | undefined): Date | undefined {
  if (Array.isArray(v)) return v.at(-1);
  return v;
}

const localPlaceholder = ref<Date>(
  adapter.value.toDateOnly(defaultPlaceholder ?? lastSelected(modelValue.value) ?? adapter.value.now()),
);
const placeholder = defineModel<Date>('placeholder', {
  default: undefined,
  get: v => v ?? localPlaceholder.value,
  set: (v) => {
    localPlaceholder.value = adapter.value.toDateOnly(v);
    return localPlaceholder.value;
  },
});

const { forwardRef, currentElement: parentElement } = useForwardExpose();
const focusedDate = ref<Date | undefined>();

const localeRef = toRef(() => locale);
const dirRef = toRef(() => dir);
// Locale-aware default: when `weekStartsOn` is omitted, derive it from the
// locale (e.g. 'en-US' → Sunday, 'fr'/'de' → Monday).
const weekStartsOn = computed<0 | 1 | 2 | 3 | 4 | 5 | 6>(() =>
  weekStartsOnProp ?? adapter.value.getLocaleWeekStartsOn(locale),
);
const weekdayFormatRef = toRef(() => weekdayFormat);
const fixedWeeksRef = toRef(() => fixedWeeks);
const numberOfMonthsRef = toRef(() => numberOfMonths);
const disabledRef = toRef(() => disabled);
const readonlyRef = toRef(() => readonly);
const pagedNavigationRef = toRef(() => pagedNavigation);
const multipleRef = toRef(() => multiple);
const preventDeselectRef = toRef(() => preventDeselect);
const disableDaysOutsideCurrentViewRef = toRef(() => disableDaysOutsideCurrentView);
const minValueRef = toRef(() => minValue);
const maxValueRef = toRef(() => maxValue);

const grid = computed<CalendarMonth[]>(() => adapter.value.createMonths({
  date: placeholder.value,
  numberOfMonths,
  weekStartsOn: weekStartsOn.value,
  fixedWeeks,
}));

const weekDays = computed(() => adapter.value.getWeekdayLabels(weekStartsOn.value, locale, weekdayFormat));

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
  const v = modelValue.value;
  if (Array.isArray(v)) return v.some(d => adapter.value.isSameDay(d, date));
  return v ? adapter.value.isSameDay(v, date) : false;
}

function isOutsideVisibleView(date: Date): boolean {
  return !grid.value.some(m => adapter.value.isSameMonth(m.value, date));
}

const isInvalid = computed(() => {
  const v = modelValue.value;
  if (Array.isArray(v)) {
    if (!v.length) return false;
    return v.some(d => isDateDisabled(d) || isDateUnavailableLocal(d));
  }
  if (!v) return false;
  return isDateDisabled(v) || isDateUnavailableLocal(v);
});

function setDate(date: Date | undefined) {
  if (readonly) return;
  if (date && (isDateDisabled(date) || isDateUnavailableLocal(date))) return;

  if (!multiple) {
    // Single mode: re-clicking the selected date deselects it unless prevented.
    if (date && !preventDeselect && !Array.isArray(modelValue.value)
      && modelValue.value && adapter.value.isSameDay(modelValue.value, date)) {
      placeholder.value = date;
      modelValue.value = undefined;
      return;
    }
    modelValue.value = date ? adapter.value.toDateOnly(date) : undefined;
    return;
  }

  // Multiple mode: toggle membership, keeping a fresh array reference.
  const current = Array.isArray(modelValue.value)
    ? modelValue.value
    : modelValue.value
      ? [modelValue.value]
      : [];
  if (!date) {
    modelValue.value = [];
    return;
  }
  const normalized = adapter.value.toDateOnly(date);
  const idx = current.findIndex(d => adapter.value.isSameDay(d, normalized));
  if (idx === -1) {
    modelValue.value = [...current, normalized];
    return;
  }
  if (preventDeselect) return;
  const next = current.filter((_, i) => i !== idx);
  modelValue.value = next.length ? next : undefined;
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
  const last = lastSelected(v);
  if (last && !adapter.value.isSameMonth(last, placeholder.value))
    placeholder.value = adapter.value.toDateOnly(last);
});

const hasSelectedDate = computed(() => {
  const v = modelValue.value;
  return Array.isArray(v) ? v.length > 0 : !!v;
});

// First in-view, non-disabled, non-unavailable date — the roving-focus fallback
// so the initial tab stop is always actionable.
const firstFocusableDate = computed(() =>
  adapter.value.findFirstFocusableDate(grid.value, isDateDisabled, isDateUnavailableLocal),
);

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
  dateAdapter: adapter,
  modelValue,
  placeholder,
  locale: localeRef,
  dir: dirRef,
  grid,
  weekDays,
  headingValue,
  fullCalendarLabel,
  weekStartsOn,
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
    <div
      :data-primitives-calendar-sr-heading="''"
      style="border:0;clip:rect(0 0 0 0);clip-path:inset(50%);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;white-space:nowrap;width:1px;"
    >
      <div
        role="heading"
        aria-level="2"
      >
        {{ fullCalendarLabel }}
      </div>
    </div>
  </Primitive>
</template>
