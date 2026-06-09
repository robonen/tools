import { computed, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { useField } from '../useField';
import { useMaskedInput } from '../useMaskedInput';
import type { UseMaskedFieldOptions, UseMaskedFieldReturn } from './types';

export type { UseMaskedFieldOptions, UseMaskedFieldReturn } from './types';

/**
 * @name useMaskedField
 * @category Forms
 * @description A masked form field: fuses {@link useField} with
 * {@link useMaskedInput} so a formatted value is shown while the form stores the
 * raw value (validation, dirty/touched, schema, and submit all read raw). Returns
 * a single `bind` object to spread onto the input — it merges the field's
 * `name`/`onBlur`/`aria-invalid` with the mask bindings (ref + handlers). Purely
 * additive — it composes the existing form composables without modifying them.
 *
 * @param {MaybeRefOrGetter<string>} path The dotted field path
 * @param {UseMaskedFieldOptions} options The mask plus any {@link useField} options
 * @returns {UseMaskedFieldReturn} The field API plus `display`, `unmasked`, `complete`, `bind`
 *
 * @example
 * const { bind, errorMessage } = useMaskedField('phone', { mask: '+1 (###) ###-####' });
 * // <input v-bind="bind">  — the form stores the raw digits
 *
 * @since 0.0.17
 */
export function useMaskedField<T = string>(
  path: MaybeRefOrGetter<string>,
  options: UseMaskedFieldOptions<T>,
): UseMaskedFieldReturn<T> {
  const field = useField<T>(path, options);
  const writesMasked = options.modelValue === 'masked';

  const mask = useMaskedInput({
    mask: options.mask,
    overwriteMode: options.overwriteMode,
    onAccept: ({ masked, unmasked }) => {
      field.handleChange((writesMasked ? masked : unmasked) as T);
    },
  });

  // Form → element: when the stored value changes from elsewhere (reset,
  // programmatic set), re-seed and re-conform the input. Skip echoes of our own
  // writes via the value we last pushed to the form.
  watch(
    () => field.value.value,
    (raw) => {
      const desired = raw === null || raw === undefined ? '' : String(raw);
      const written = writesMasked ? mask.masked.value : mask.unmasked.value;
      if (written === desired)
        return;

      mask.setValue(desired);
    },
    { immediate: true, flush: 'post' },
  );

  const bind = computed<Record<string, unknown>>(() => ({ ...field.attrs.value, ...mask.bind }));

  return {
    ...field,
    display: mask.masked,
    unmasked: mask.unmasked,
    complete: mask.complete,
    bind,
  };
}
