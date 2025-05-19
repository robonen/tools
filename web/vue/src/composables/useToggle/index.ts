import { isRef, ref, toValue, type MaybeRefOrGetter, type MaybeRef, type Ref } from 'vue';

// TODO: wip

export interface UseToggleOptions<Enabled, Disabled> {
    enabledValue?: MaybeRefOrGetter<Enabled>,
    disabledValue?: MaybeRefOrGetter<Disabled>,
}

// two overloads
// 1. const [state, toggle] = useToggle(nonRefValue, options)
// 2. const toggle = useToggle(refValue, options)
// 3. const [state, toggle] = useToggle() // true, false by default

export function useToggle<V extends Enabled | Disabled, Enabled = true, Disabled = false>(
    initialValue: Ref<V>,
    options?: UseToggleOptions<Enabled, Disabled>,
): (value?: V) => V;

export function useToggle<V extends Enabled | Disabled, Enabled = true, Disabled = false>(
    initialValue?: V,
    options?: UseToggleOptions<Enabled, Disabled>,
): [Ref<V>, (value?: V) => V];

export function useToggle<V extends Enabled | Disabled, Enabled = true, Disabled = false>(
    initialValue: MaybeRef<V> = false,
    options: UseToggleOptions<Enabled, Disabled> = {},
) {
    const {
        enabledValue = false,
        disabledValue = true,
    } = options;

    const state = ref(initialValue) as Ref<V>;

    const toggle = (value?: V) => {
        if (arguments.length) {
            state.value = value!;
            return state.value;
        }
        
        const enabled = toValue(enabledValue);
        const disabled = toValue(disabledValue);

        state.value = state.value === enabled ? disabled : enabled;

        return state.value;
    };

    return isRef(initialValue) ? toggle : [state, toggle];
}
