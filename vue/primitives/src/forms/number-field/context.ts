import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface NumberFieldContext {
  value: Ref<number | null>;
  min: Ref<number | undefined>;
  max: Ref<number | undefined>;
  step: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  increment: (delta?: number) => void;
  decrement: (delta?: number) => void;
  setValue: (v: number | null) => void;
  inputId: string;
  /** Text shown in the field, formatted with the active locale/format options. */
  textValue: ComputedRef<string>;
  /** Suggested soft-keyboard mode derived from whether fractional input is allowed. */
  inputMode: ComputedRef<'numeric' | 'decimal'>;
  /** Live parse of a raw input string to a value (empty/unparseable → `null`). */
  parseInput: (raw: string) => number | null;
  /** Re-parse, snap, clamp, and reformat the raw input string. Used on commit. */
  applyInputValue: (raw: string) => void;
  /** `true` when a prospective raw value is a valid partial number for the locale. */
  validate: (raw: string) => boolean;
  /** `true` when the next increment would exceed `max`. */
  isIncrementDisabled: ComputedRef<boolean>;
  /** `true` when the next decrement would drop below `min`. */
  isDecrementDisabled: ComputedRef<boolean>;
  /** Suppress wheel-driven stepping. */
  disableWheelChange: Ref<boolean>;
  /** Invert the direction of wheel-driven stepping. */
  invertWheelChange: Ref<boolean>;
  /** Return focus to the input after a stepper button changes the value. */
  focusOnChange: Ref<boolean>;
  /** Track the live input element so wheel / focus-on-change can target it. */
  inputEl: Ref<HTMLInputElement | undefined>;
  onInputElement: (el: HTMLInputElement | undefined) => void;
}

const ctx = useContextFactory<NumberFieldContext>('NumberFieldContext');

export const provideNumberFieldContext = ctx.provide;
export const useNumberFieldContext = ctx.inject;
