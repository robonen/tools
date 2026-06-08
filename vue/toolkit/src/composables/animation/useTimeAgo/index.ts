import { computed, shallowRef, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { isFunction, isNumber, isString } from '@robonen/stdlib';
import type { ResumableActions } from '@/types';
import { useIntervalFn } from '@/composables/animation/useIntervalFn';

/**
 * Formatter for a single unit value. Receives the rounded numeric value and
 * whether the instant is in the past, and returns the localized fragment.
 */
export type UseTimeAgoFormatter<T = number> = (value: T, isPast: boolean) => string;

/**
 * The default set of unit names recognized by `useTimeAgo`.
 */
export type UseTimeAgoUnitName
  = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * A single time unit used while resolving the most appropriate granularity.
 */
export interface UseTimeAgoUnit<Unit extends string = UseTimeAgoUnitName> {
  /**
   * Upper bound (exclusive) of the absolute diff (ms) this unit applies to
   */
  max: number;

  /**
   * Length of one unit in milliseconds
   */
  value: number;

  /**
   * Unit name; used to look up the matching message formatter
   */
  name: Unit;
}

/**
 * Built-in (non-unit) message slots.
 */
export interface UseTimeAgoMessagesBuiltIn {
  /**
   * Shown when the diff is below the smallest displayed unit
   */
  justNow: string;

  /**
   * Wraps a past fragment (e.g. `'3 minutes'` -> `'3 minutes ago'`)
   */
  past: string | UseTimeAgoFormatter<string>;

  /**
   * Wraps a future fragment (e.g. `'3 minutes'` -> `'in 3 minutes'`)
   */
  future: string | UseTimeAgoFormatter<string>;

  /**
   * Shown when the provided time cannot be parsed into a valid date
   */
  invalid: string;
}

/**
 * Full message map: the built-in slots plus a formatter per unit name.
 */
export type UseTimeAgoMessages<UnitNames extends string = UseTimeAgoUnitName>
  = UseTimeAgoMessagesBuiltIn & Record<UnitNames, string | UseTimeAgoFormatter<number>>;

/**
 * Options shared by the pure `formatTimeAgo` and the reactive `useTimeAgo`.
 */
export interface FormatTimeAgoOptions<UnitNames extends string = UseTimeAgoUnitName> {
  /**
   * Maximum unit (or absolute ms diff) to display before falling back to
   * `fullDateFormatter`.
   */
  max?: UnitNames | number;

  /**
   * Formatter applied when the diff exceeds `max`.
   *
   * @default (date) => date.toISOString().slice(0, 10)
   */
  fullDateFormatter?: (date: Date) => string;

  /**
   * Localized messages.
   */
  messages?: UseTimeAgoMessages<UnitNames>;

  /**
   * Show seconds (i.e. allow sub-minute granularity) instead of `justNow`.
   *
   * @default false
   */
  showSecond?: boolean;

  /**
   * Rounding strategy applied to unit values. A string maps to the matching
   * `Math` method; a number rounds to that many decimal places.
   *
   * @default 'round'
   */
  rounding?: 'round' | 'ceil' | 'floor' | number;

  /**
   * Custom ordered list of units (ascending by `value`).
   */
  units?: Array<UseTimeAgoUnit<UnitNames>>;
}

/**
 * Options for `useTimeAgo`.
 */
export interface UseTimeAgoOptions<Controls extends boolean, UnitNames extends string = UseTimeAgoUnitName>
  extends FormatTimeAgoOptions<UnitNames> {
  /**
   * Expose pause/resume controls alongside the time string.
   *
   * @default false
   */
  controls?: Controls;

  /**
   * Interval (ms) at which the relative string is recomputed.
   *
   * @default 30000
   */
  updateInterval?: number;

  /**
   * Start the update interval immediately.
   *
   * @default true
   */
  immediate?: boolean;
}

/**
 * Controls returned when `controls: true`.
 */
export interface UseTimeAgoControls extends ResumableActions {
  /**
   * The reactive relative-time string
   */
  timeAgo: ComputedRef<string>;

  /**
   * Whether the update interval is currently active
   */
  isActive: Readonly<Ref<boolean>>;
}

export type UseTimeAgoReturn<Controls extends boolean = false>
  = Controls extends true ? UseTimeAgoControls : ComputedRef<string>;

const DEFAULT_UNITS: Array<UseTimeAgoUnit<UseTimeAgoUnitName>> = [
  { max: 60000, value: 1000, name: 'second' },
  { max: 2760000, value: 60000, name: 'minute' },
  { max: 72000000, value: 3600000, name: 'hour' },
  { max: 518400000, value: 86400000, name: 'day' },
  { max: 2419200000, value: 604800000, name: 'week' },
  { max: 28512000000, value: 2592000000, name: 'month' },
  { max: Number.POSITIVE_INFINITY, value: 31536000000, name: 'year' },
];

const DEFAULT_MESSAGES: UseTimeAgoMessages<UseTimeAgoUnitName> = {
  justNow: 'just now',
  past: n => /\d/.test(n) ? `${n} ago` : n,
  future: n => /\d/.test(n) ? `in ${n}` : n,
  month: (n, past) => n === 1 ? (past ? 'last month' : 'next month') : `${n} month${n > 1 ? 's' : ''}`,
  year: (n, past) => n === 1 ? (past ? 'last year' : 'next year') : `${n} year${n > 1 ? 's' : ''}`,
  day: (n, past) => n === 1 ? (past ? 'yesterday' : 'tomorrow') : `${n} day${n > 1 ? 's' : ''}`,
  week: (n, past) => n === 1 ? (past ? 'last week' : 'next week') : `${n} week${n > 1 ? 's' : ''}`,
  hour: n => `${n} hour${n > 1 ? 's' : ''}`,
  minute: n => `${n} minute${n > 1 ? 's' : ''}`,
  second: n => `${n} second${n > 1 ? 's' : ''}`,
  invalid: '',
};

function defaultFullDateFormatter(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Pure (non-reactive) relative-time formatter. Useful on its own and reused by
 * `useTimeAgo` on every tick.
 *
 * @param {Date} from The instant to describe
 * @param {FormatTimeAgoOptions} [options={}] Formatting options
 * @param {Date | number} [now=Date.now()] The reference "now"
 * @returns {string} The localized relative-time string
 *
 * @example
 * formatTimeAgo(new Date(Date.now() - 3 * 60_000)); // '3 minutes ago'
 *
 * @since 0.0.15
 */
export function formatTimeAgo<UnitNames extends string = UseTimeAgoUnitName>(
  from: Date,
  options: FormatTimeAgoOptions<UnitNames> = {},
  now: Date | number = Date.now(),
): string {
  const {
    max,
    messages = DEFAULT_MESSAGES as UseTimeAgoMessages<UnitNames>,
    fullDateFormatter = defaultFullDateFormatter,
    units = DEFAULT_UNITS as Array<UseTimeAgoUnit<UnitNames>>,
    showSecond = false,
    rounding = 'round',
  } = options;

  const fromMs = +from;

  if (Number.isNaN(fromMs))
    return messages.invalid;

  const roundFn = isNumber(rounding)
    ? (n: number): number => +n.toFixed(rounding)
    : Math[rounding];

  const diff = +now - fromMs;
  const absDiff = Math.abs(diff);

  function getValue(unit: UseTimeAgoUnit<UnitNames>): number {
    return roundFn(absDiff / unit.value);
  }

  function applyFormat(
    name: UnitNames | keyof UseTimeAgoMessagesBuiltIn,
    val: number | string,
    isPast: boolean,
  ): string {
    const formatter = messages[name];

    if (isFunction(formatter))
      return formatter(val as never, isPast);

    return formatter.replace('{0}', val.toString());
  }

  function format(unit: UseTimeAgoUnit<UnitNames>): string {
    const val = getValue(unit);
    const past = diff > 0;
    const str = applyFormat(unit.name, val, past);

    return applyFormat(past ? 'past' : 'future', str, past);
  }

  if (absDiff < 60000 && !showSecond)
    return messages.justNow;

  if (isNumber(max) && absDiff > max)
    return fullDateFormatter(new Date(from));

  if (isString(max)) {
    const unitMax = units.find(unit => unit.name === max)?.max;

    if (unitMax && absDiff > unitMax)
      return fullDateFormatter(new Date(from));
  }

  for (let idx = 0; idx < units.length; idx++) {
    const unit = units[idx]!;
    const prev = units[idx - 1];

    if (getValue(unit) <= 0 && prev)
      return format(prev);

    if (absDiff < unit.max)
      return format(unit);
  }

  return messages.invalid;
}

/**
 * @name useTimeAgo
 * @category Animation
 * @description Reactive relative time string (e.g. `'3 minutes ago'`) that
 * ticks on a fixed interval. Fully customizable messages (i18n), units,
 * rounding, and an automatic fallback to a full date once `max` is exceeded.
 *
 * @param {MaybeRefOrGetter<Date | number | string>} time The instant to describe (reactive)
 * @param {UseTimeAgoOptions} [options={}] Options
 * @returns {ComputedRef<string> | UseTimeAgoControls} The reactive string, or controls when `controls: true`
 *
 * @example
 * const timeAgo = useTimeAgo(new Date(Date.now() - 60_000)); // '1 minute ago'
 *
 * @example
 * // With pause/resume controls and a custom update cadence
 * const { timeAgo, pause, resume } = useTimeAgo(date, { controls: true, updateInterval: 1000 });
 *
 * @example
 * // i18n + full-date fallback past one month
 * const timeAgo = useTimeAgo(date, {
 *   max: 'month',
 *   messages: { ...customMessages },
 *   fullDateFormatter: d => d.toLocaleDateString('fr-FR'),
 * });
 *
 * @since 0.0.15
 */
export function useTimeAgo<UnitNames extends string = UseTimeAgoUnitName>(
  time: MaybeRefOrGetter<Date | number | string>,
  options?: UseTimeAgoOptions<false, UnitNames>,
): ComputedRef<string>;
export function useTimeAgo<UnitNames extends string = UseTimeAgoUnitName>(
  time: MaybeRefOrGetter<Date | number | string>,
  options: UseTimeAgoOptions<true, UnitNames>,
): UseTimeAgoControls;
export function useTimeAgo<UnitNames extends string = UseTimeAgoUnitName>(
  time: MaybeRefOrGetter<Date | number | string>,
  options: UseTimeAgoOptions<boolean, UnitNames> = {},
): ComputedRef<string> | UseTimeAgoControls {
  const {
    controls = false,
    updateInterval = 30000,
    immediate = true,
  } = options;

  // A single ticking ref drives recomputation; the heavy formatting stays in
  // a computed so it only runs when `now` or `time` actually change.
  const now = shallowRef(Date.now());

  const resumable = useIntervalFn(() => {
    now.value = Date.now();
  }, updateInterval, { immediate });

  const timeAgo = computed(() => formatTimeAgo(new Date(toValue(time)), options, now.value));

  if (controls) {
    return {
      timeAgo,
      isActive: resumable.isActive,
      pause: resumable.pause,
      resume: resumable.resume,
      toggle: resumable.toggle,
    };
  }

  return timeAgo;
}
