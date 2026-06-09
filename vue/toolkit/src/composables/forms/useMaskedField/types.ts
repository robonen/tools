import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import type { MaskOptionInput, OverwriteMode } from '../mask';
import type { UseFieldOptions, UseFieldReturn } from '../useForm';

/**
 * Options for {@link useMaskedField}. Extends {@link UseFieldOptions} with the
 * mask configuration.
 */
export interface UseMaskedFieldOptions<T = string> extends UseFieldOptions<T> {
  /**
   * The mask source: a full options object, a bare mask, or a template string.
   * May be reactive.
   */
  mask: MaybeRefOrGetter<MaskOptionInput>;

  /**
   * Which view of the value is written into the form (and submitted):
   * - `unmasked` — the raw value (recommended: schemas validate clean data);
   * - `masked` — the formatted display string.
   *
   * @default 'unmasked'
   */
  modelValue?: 'masked' | 'unmasked';

  /**
   * Insert vs overwrite behavior under a collapsed caret.
   *
   * @default 'shift'
   */
  overwriteMode?: OverwriteMode;
}

/**
 * The reactive API returned by {@link useMaskedField}: everything from
 * {@link useField} plus the masking views and a single `bind` object.
 */
export interface UseMaskedFieldReturn<T = string> extends UseFieldReturn<T> {
  /**
   * The masked display text (read-only; the input shows it via `bind`).
   */
  display: ShallowRef<string>;
  /**
   * The raw unmasked value (mirrors what is written to the form by default).
   */
  unmasked: Readonly<ShallowRef<string>>;
  /**
   * Whether the mask is fully satisfied.
   */
  complete: ComputedRef<boolean>;
  /**
   * Spread onto the input (`<input v-bind="bind">`): merges the field's
   * `name`/`onBlur`/`aria-invalid` with the mask bindings (ref + input handlers).
   */
  bind: ComputedRef<Record<string, unknown>>;
}
