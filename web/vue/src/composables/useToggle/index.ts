import { isRef, ref, toValue, type MaybeRefOrGetter, type MaybeRef, type Ref } from 'vue';

export interface UseToggleOptions<Truthy, Falsy> {
    truthyValue?: MaybeRefOrGetter<Truthy>,
    falsyValue?: MaybeRefOrGetter<Falsy>,
}

export function useToggle<Truthy = true, Falsy = false>(
    initialValue?: MaybeRef<Truthy | Falsy>,
    options?: UseToggleOptions<Truthy, Falsy>,
): { value: Ref<Truthy | Falsy>, toggle: (value?: Truthy | Falsy) => Truthy | Falsy };

export function useToggle<Truthy = true, Falsy = false>(
    initialValue: MaybeRef<Truthy | Falsy> = false as Truthy | Falsy,
    options: UseToggleOptions<Truthy, Falsy> = {},
) {
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
