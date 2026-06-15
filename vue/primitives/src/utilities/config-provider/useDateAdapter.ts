import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { DateAdapter } from './date-adapter';
import { computed, toValue } from 'vue';
import { useConfig } from './context';

/**
 * Resolves the effective {@link DateAdapter}: a per-component override wins over
 * the active `ConfigProvider` `dateAdapter`, which falls back to the native
 * `Date` adapter. Lets calendar/date-picker primitives route every date
 * operation through a single, swappable backend instead of hard-coding `Date`.
 *
 * The type parameter `TDate` re-asserts the concrete date representation at the
 * call site (the context stores a type-erased adapter), so a primitive built on
 * a custom adapter gets correctly-typed dates back.
 *
 * @param override Optional per-component adapter override.
 * @returns A computed `DateAdapter<TDate>` combining the override with config.
 */
export function useDateAdapter<TDate = Date>(
  override?: MaybeRefOrGetter<DateAdapter<TDate> | undefined>,
): ComputedRef<DateAdapter<TDate>> {
  const config = useConfig();
  return computed(
    () => (toValue(override) ?? config.dateAdapter.value) as DateAdapter<TDate>,
  );
}
