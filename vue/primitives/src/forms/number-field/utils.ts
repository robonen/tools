import type { MaybeRefOrGetter, Ref } from 'vue';
import { computed, onScopeDispose, ref, toValue } from 'vue';
import { createEventHook, useEventListener } from '@robonen/vue';

/**
 * Decimal-safe add/subtract. Floating point makes `0.1 + 0.2 === 0.30000000000000004`,
 * which is wrong for a stepper. We scale both operands to integers by the larger
 * of their decimal lengths, operate, then scale back.
 */
export function handleDecimalOperation(operator: '+' | '-', a: number, b: number): number {
  let result = operator === '+' ? a + b : a - b;

  if (a % 1 !== 0 || b % 1 !== 0) {
    const aDecimals = a.toString().split('.')[1]?.length ?? 0;
    const bDecimals = b.toString().split('.')[1]?.length ?? 0;
    const multiplier = 10 ** Math.max(aDecimals, bDecimals);

    const aInt = Math.round(a * multiplier);
    const bInt = Math.round(b * multiplier);

    result = (operator === '+' ? aInt + bInt : aInt - bInt) / multiplier;
  }

  return result;
}

/**
 * Round a value to the decimal precision implied by `step` (e.g. step `0.5` →
 * one decimal place), correcting floating-point drift after snapping.
 */
export function roundToStepPrecision(value: number, step: number): number {
  const stepString = step.toString();
  const pointIndex = stepString.indexOf('.');
  const precision = pointIndex >= 0 ? stepString.length - pointIndex - 1 : 0;

  if (precision > 0) {
    const pow = 10 ** precision;
    return Math.round(value * pow) / pow;
  }

  return value;
}

/**
 * Snap `value` to the nearest multiple of `step` within `[min, max]`. Mirrors the
 * spinbutton semantics: when the value lands beyond a bound the snapped result is
 * pulled back to the last reachable on-grid value inside the range.
 */
export function snapValueToStep(value: number, min: number | undefined, max: number | undefined, step: number): number {
  const lo = min ?? Number.NaN;
  const hi = max ?? Number.NaN;

  const remainder = (value - (Number.isNaN(lo) ? 0 : lo)) % step;
  let snapped = roundToStepPrecision(
    Math.abs(remainder) * 2 >= step
      ? value + Math.sign(remainder) * (step - Math.abs(remainder))
      : value - remainder,
    step,
  );

  if (!Number.isNaN(lo)) {
    if (snapped < lo)
      snapped = lo;
    else if (!Number.isNaN(hi) && snapped > hi)
      snapped = lo + Math.floor(roundToStepPrecision((hi - lo) / step, step)) * step;
  }
  else if (!Number.isNaN(hi) && snapped > hi) {
    snapped = Math.floor(roundToStepPrecision(hi / step, step)) * step;
  }

  return roundToStepPrecision(snapped, step);
}

export interface UsePressedHoldOptions {
  /** Element the press starts on (pointer must go down on it). */
  target: Ref<HTMLElement | undefined>;
  /** When `true`, presses are ignored and any in-flight repeat stops. */
  disabled: MaybeRefOrGetter<boolean>;
}

export interface UsePressedHoldReturn {
  /** `true` while the pointer is held down on the target. */
  isPressed: Ref<boolean>;
  /** Register a callback fired once on press and then repeatedly while held. */
  onTrigger: (fn: () => void) => void;
  /**
   * `true` for one `click` immediately after a real pointer press already fired
   * the trigger. Lets a `@click` fallback (for programmatic / keyboard-activated
   * clicks that emit no `pointerdown`) avoid double-firing.
   */
  consumeClick: () => boolean;
}

/**
 * Press-and-hold auto-repeat for stepper buttons: fires immediately on
 * pointer-down, then repeats every 60ms after an initial 400ms delay until the
 * pointer is released, cancelled, or leaves. Built on the toolkit's
 * `useEventListener` (auto-cleaned on scope dispose) and `createEventHook`.
 */
export function usePressedHold(options: UsePressedHoldOptions): UsePressedHoldReturn {
  const { target, disabled } = options;
  const isPressed = ref(false);
  const triggerHook = createEventHook<void>();

  let timer: ReturnType<typeof setTimeout> | undefined;
  // Set when a pointer press fired the trigger; the synthetic `click` that the
  // browser dispatches afterwards must be swallowed by the `@click` fallback.
  let pressDidTrigger = false;

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function repeat(delay: number): void {
    clearTimer();
    if (toValue(disabled))
      return;

    triggerHook.trigger();
    timer = setTimeout(() => repeat(60), delay);
  }

  function onPressStart(event: PointerEvent): void {
    // Only the primary (left) button, and ignore re-entrant presses.
    if (event.button !== 0 || isPressed.value || toValue(disabled))
      return;

    event.preventDefault();
    isPressed.value = true;
    pressDidTrigger = true;
    repeat(400);
  }

  function onPressEnd(): void {
    isPressed.value = false;
    clearTimer();
  }

  function consumeClick(): boolean {
    if (pressDidTrigger) {
      pressDidTrigger = false;
      return true;
    }
    return false;
  }

  useEventListener(target, 'pointerdown', onPressStart);
  // Release/cancel are watched on `window` so lifting the pointer outside the
  // button still ends the hold; leaving the button also ends it.
  useEventListener(globalThis.window, 'pointerup', onPressEnd);
  useEventListener(globalThis.window, 'pointercancel', onPressEnd);
  useEventListener(target, 'pointerleave', onPressEnd);

  // Clear any in-flight repeat when the owning component unmounts.
  onScopeDispose(clearTimer);

  return {
    isPressed,
    onTrigger: triggerHook.on,
    consumeClick,
  };
}

/**
 * Lightweight, locale-aware number formatting/parsing on top of native
 * `Intl.NumberFormat` (no external i18n dependency). `format` renders the value
 * with grouping/currency/percent per `options`; `parse` strips locale-specific
 * group and decimal separators (and currency/percent symbols) back to a plain
 * `number`, returning `NaN` for unparseable input.
 */
export function createNumberFormat(locale: MaybeRefOrGetter<string>, options: MaybeRefOrGetter<Intl.NumberFormatOptions | undefined>) {
  const formatter = computed(() => new Intl.NumberFormat(toValue(locale), toValue(options)));

  const separators = computed(() => {
    const parts = formatter.value.formatToParts(12345.6);
    const group = parts.find(p => p.type === 'group')?.value ?? ',';
    const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.';
    return { group, decimal };
  });

  const resolved = computed(() => formatter.value.resolvedOptions());

  // The partial-validation pattern depends solely on the locale decimal
  // separator, so rebuild it only when that separator changes rather than on
  // every keystroke (isValidPartial runs from @beforeinput per character).
  const partialRe = computed(
    () => new RegExp(`^[+-]?[\\d${escapeRegExp(separators.value.decimal)}.,\\s\\u00A0%$€£¥]*$`),
  );

  function format(value: number): string {
    return formatter.value.format(value);
  }

  function parse(raw: string): number {
    const trimmed = raw.trim();
    if (trimmed === '')
      return Number.NaN;

    const { group, decimal } = separators.value;
    // Strip everything except digits, sign, and the locale decimal separator,
    // then normalise the decimal separator to `.` for `Number`.
    const cleaned = trimmed
      .split(group).join('')
      .split(decimal).join('.')
      .replaceAll(/[^\d.\-+e]/gi, '');

    // No digits at all → not a number (`Number('')` would coerce to 0).
    if (!/\d/.test(cleaned))
      return Number.NaN;

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : Number.NaN;
  }

  function isValidPartial(raw: string): boolean {
    if (raw === '' || raw === '-' || raw === '+')
      return true;

    return partialRe.value.test(raw);
  }

  return { format, parse, isValidPartial, resolved };
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
