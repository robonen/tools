import type { ComputedRef, Ref } from 'vue';
import type { CalendarMonth, WeekDayFormat } from './utils';
import { useContextFactory } from '@robonen/vue';

export interface CalendarRootContext {
  /** Currently selected date (or undefined). */
  modelValue: Ref<Date | undefined>;
  /** Displayed month anchor. */
  placeholder: Ref<Date>;
  /** Locale identifier for `Intl` formatting. */
  locale: Ref<string>;
  /** Reading direction. */
  dir: Ref<'ltr' | 'rtl'>;

  /** Computed grid of months (each with 6×7 weeks). */
  grid: ComputedRef<CalendarMonth[]>;
  /** Localized weekday labels (length 7). */
  weekDays: ComputedRef<string[]>;
  /** Heading text (month + year). */
  headingValue: ComputedRef<string>;
  /** Full aria-label for the calendar region. */
  fullCalendarLabel: ComputedRef<string>;

  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  pagedNavigation: Ref<boolean>;

  minValue: Ref<Date | undefined>;
  maxValue: Ref<Date | undefined>;

  isDateDisabled: (date: Date) => boolean;
  isDateUnavailable: (date: Date) => boolean;
  isDateSelected: (date: Date) => boolean;
  isOutsideVisibleView: (date: Date) => boolean;
  isInvalid: ComputedRef<boolean>;

  /** Element hosting the calendar grid(s); used for keyboard focus shifting. */
  parentElement: Ref<HTMLElement | undefined>;
  /** Currently focused day, drives `tabindex`. */
  focusedDate: Ref<Date | undefined>;

  setDate: (date: Date | undefined) => void;
  setPlaceholder: (date: Date) => void;
  nextPage: (fn?: (placeholder: Date) => Date) => void;
  prevPage: (fn?: (placeholder: Date) => Date) => void;
  nextYear: () => void;
  prevYear: () => void;
  isNextButtonDisabled: (fn?: (placeholder: Date) => Date) => boolean;
  isPrevButtonDisabled: (fn?: (placeholder: Date) => Date) => boolean;
}

const ctx = useContextFactory<CalendarRootContext>('CalendarRoot');
export const provideCalendarRootContext = ctx.provide;
export const useCalendarRootContext = ctx.inject;

export interface CalendarGridContext {
  /** The month this `<table>` is rendering. */
  month: Ref<Date>;
}

const gridCtx = useContextFactory<CalendarGridContext>('CalendarGrid');
export const provideCalendarGridContext = gridCtx.provide;
export const useCalendarGridContext = gridCtx.inject;
