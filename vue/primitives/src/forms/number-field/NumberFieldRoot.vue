<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A numeric input with stepper controls, keyboard increment/decrement, and
 * optional clamping. The interactive root: it owns the value (controlled via
 * `v-model` / `update:modelValue` or uncontrolled via `defaultValue`), clamps
 * to `min`/`max`, snaps to `step`, formats with the active locale, and provides
 * context to `NumberFieldInput`, `NumberFieldIncrement`, and
 * `NumberFieldDecrement`. Use it whenever you need a styled number entry with
 * spinner buttons and arrow-key support.
 */
export interface NumberFieldRootProps extends PrimitiveProps {
  defaultValue?: number | null;
  min?: number;
  max?: number;
  step?: number;
  /** When `false`, values are clamped but not snapped to the nearest step. */
  stepSnapping?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  /** Native input name; submits the value with the surrounding `<form>`. */
  name?: string;
  /** Mark the field required so native form validation fires on empty submit. */
  required?: boolean;
  /** `Intl.NumberFormat` options controlling display and the allowed characters. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Locale override for formatting/parsing; falls back to the app `ConfigProvider`. */
  locale?: string;
  /** When `false`, wheel scrolling over the input does not change the value. */
  disableWheelChange?: boolean;
  /** Invert the direction of wheel-driven stepping. */
  invertWheelChange?: boolean;
  /** When `true` (default), stepper buttons return focus to the input. */
  focusOnChange?: boolean;
}

export interface NumberFieldRootEmits {
  valueChange: [value: number | null];
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { provideNumberFieldContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';
import { useId, useLocale } from '../../utilities/config-provider';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';
import { createNumberFormat, handleDecimalOperation, snapValueToStep } from './utils';

const {
  step = 1,
  stepSnapping = true,
  disabled = false,
  readonly = false,
  focusOnChange = true,
  disableWheelChange = false,
  invertWheelChange = false,
  min,
  max,
  name,
  required,
  formatOptions,
  locale: localeProp,
  defaultValue,
  as = 'div',
} = defineProps<NumberFieldRootProps>();

const emit = defineEmits<NumberFieldRootEmits>();

// `defineModel` drives both controlled (`v-model`) and uncontrolled modes; in
// uncontrolled mode `model.value` is `undefined` until first write, so the
// internal `localValue` below seeds from `defaultValue` and stays the live
// source of truth (synchronous multi-step updates can't wait on a prop re-flow).
const model = defineModel<number | null>();

const localValue = ref<number | null>(
  model.value !== undefined ? model.value : (defaultValue ?? null),
);

watch(model, (v) => {
  if (v === undefined) return;
  if (v === localValue.value) return;
  localValue.value = v;
});

const locale = useLocale(() => localeProp);
const numberFormat = createNumberFormat(locale, () => formatOptions);

const inputEl = shallowRef<HTMLInputElement>();

function clampInput(v: number): number {
  if (stepSnapping && Number.isFinite(step))
    return snapValueToStep(v, min, max, step);
  return clamp(v, min ?? -Infinity, max ?? Infinity);
}

function setValue(v: number | null): void {
  if (disabled || readonly) return;
  const next = v === null ? null : clampInput(v);
  if (next === localValue.value) return;
  localValue.value = next;
  // `defineModel` emits `update:modelValue` on write — no manual emit needed.
  model.value = next;
  emit('valueChange', next);
}

function step_(delta: number, sign: '+' | '-'): void {
  const base = localValue.value ?? min ?? 0;
  setValue(handleDecimalOperation(sign, base, delta));
  if (focusOnChange)
    inputEl.value?.focus();
}

function increment(delta = step): void {
  step_(delta, '+');
}
function decrement(delta = step): void {
  step_(delta, '-');
}

const textValue = computed(() => {
  if (localValue.value === null)
    return '';
  // Only run the locale formatter when format options are present, so the
  // plain-number contract (and existing `String(value)` display) is preserved.
  return formatOptions ? numberFormat.format(localValue.value) : String(localValue.value);
});

const inputMode = computed<'numeric' | 'decimal'>(() => {
  // Default `Intl.NumberFormat` reports 3 fraction digits, so only trust the
  // formatter when the consumer actually passed `formatOptions`; otherwise the
  // soft-keyboard hint is driven purely by whether the step is fractional.
  const fractionDigits = formatOptions ? (numberFormat.resolved.value.maximumFractionDigits ?? 0) : 0;
  const allowsFraction = fractionDigits > 0 || !Number.isInteger(step);
  return allowsFraction ? 'decimal' : 'numeric';
});

function parseRaw(raw: string): number {
  return formatOptions ? numberFormat.parse(raw) : Number(raw.trim());
}

function parseInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '')
    return null;
  const parsed = parseRaw(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyInputValue(raw: string): void {
  const trimmed = raw.trim();
  if (trimmed === '') {
    setValue(null);
    return;
  }
  const parsed = parseRaw(trimmed);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed))
    return;
  setValue(parsed);
}

function validate(raw: string): boolean {
  if (!formatOptions)
    return true;
  return numberFormat.isValidPartial(raw);
}

const isIncrementDisabled = computed(() => {
  if (localValue.value === null || max === undefined)
    return false;
  return handleDecimalOperation('+', localValue.value, step) > max && localValue.value >= max;
});
const isDecrementDisabled = computed(() => {
  if (localValue.value === null || min === undefined)
    return false;
  return handleDecimalOperation('-', localValue.value, step) < min && localValue.value <= min;
});

const inputId = useId(undefined, 'number-field-input').value;

// `defineExpose` is consumed and merged by `useForwardExpose` — it must run
// first so the imperative API is forwarded alongside the element ref (and so
// `expose()` is only called once).
defineExpose({ value: localValue, increment, decrement, setValue });
const { forwardRef, currentElement } = useForwardExpose();

const isFormControl = computed(() => {
  const el = currentElement.value;
  return !!el && !!el.closest('form');
});

provideNumberFieldContext({
  value: localValue,
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  min: toRef(() => min),
  max: toRef(() => max),
  step: toRef(() => step),
  disabled: toRef(() => disabled),
  readonly: toRef(() => readonly),
  increment,
  decrement,
  setValue,
  inputId,
  textValue,
  inputMode,
  parseInput,
  applyInputValue,
  validate,
  isIncrementDisabled,
  isDecrementDisabled,
  disableWheelChange: toRef(() => disableWheelChange),
  invertWheelChange: toRef(() => invertWheelChange),
  focusOnChange: toRef(() => focusOnChange),
  inputEl,
  onInputElement: (el) => { inputEl.value = el; },
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="group"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
  >
    <slot
      :value="localValue"
      :text-value="textValue"
      :increment="increment"
      :decrement="decrement"
    />

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      :name="name"
      :value="localValue"
      :required="required"
      :disabled="disabled"
    />
  </Primitive>
</template>
