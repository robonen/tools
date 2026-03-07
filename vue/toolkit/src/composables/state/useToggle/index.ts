import { ref, toValue } from 'vue';
import type { MaybeRefOrGetter, MaybeRef, Ref } from 'vue';

export interface UseToggleOptions<Truthy, Falsy> {
  truthyValue?: MaybeRefOrGetter<Truthy>;
  falsyValue?: MaybeRefOrGetter<Falsy>;
}

export interface UseToggleReturn<Truthy, Falsy> {
  value: Ref<Truthy | Falsy>;
  toggle: (value?: Truthy | Falsy) => Truthy | Falsy;
}

/**
 * @name useToggle
 * @category State
 * @description A composable that provides a boolean toggle with customizable truthy/falsy values
 *
 * @param {MaybeRef<Truthy | Falsy>} [initialValue=false] The initial value
 * @param {UseToggleOptions<Truthy, Falsy>} [options={}] Options for custom truthy/falsy values
 * @returns {UseToggleReturn<Truthy, Falsy>} The toggle state and function
 *
 * @example
 * const { value, toggle } = useToggle();
 *
 * @example
 * const { value, toggle } = useToggle(false, { truthyValue: 'on', falsyValue: 'off' });
 *
 * @since 0.0.1
 */
export function useToggle<Truthy = true, Falsy = false>(
  initialValue: MaybeRef<Truthy | Falsy> = false as Truthy | Falsy,
  options: UseToggleOptions<Truthy, Falsy> = {},
): UseToggleReturn<Truthy, Falsy> {
  const {
    truthyValue = true as Truthy,
    falsyValue = false as Falsy,
  } = options;

  const value = ref(initialValue) as Ref<Truthy | Falsy>;

  const toggle = (newValue?: Truthy | Falsy) => {
    if (newValue !== undefined) {
      value.value = newValue;
      return value.value;
    }

    const truthy = toValue(truthyValue);
    const falsy = toValue(falsyValue);

    value.value = value.value === truthy ? falsy : truthy;

    return value.value;
  };

  return { value, toggle };
}
